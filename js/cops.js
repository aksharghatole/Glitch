// Cop spawning + AI + rendering.

import { COP_TYPES, pickCopType, maxCopsForHeat } from '../data/cops-config.js';
import { Heat } from './heat.js';
import { Glitch } from './glitch.js';
import { Camera } from './camera.js';
import { drawVehicle, drawHelicopter, policeShape } from './vehicle-art.js';
import { handleCarCollision } from './damage.js';

export class Cop {
  constructor(typeId, x, y) {
    const cfg = COP_TYPES[typeId] || COP_TYPES.patrol;
    this.cfg = cfg;
    this.typeId = cfg.id;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.radius = cfg.radius;
    this.health = cfg.health;
    this.maxHealth = cfg.health;
    this.weight = cfg.weight;
    this.sirenPhase = Math.random() * Math.PI * 2;
    this.stuckTimer = 0;
    this.flankOffset = (Math.random() - 0.5) * 200; // for interceptors
  }

  update(dt, player, world) {
    const cfg = this.cfg;

    if (cfg.static) return;
      // Recover timer — after being rammed, cop drifts briefly
      if (this.recoverTimer === undefined) this.recoverTimer = 0;
      if (this.recoverTimer > 0) {
        this.recoverTimer -= dt;
        // Drift (no target chase)
        this.vx *= 0.97;
        this.vy *= 0.97;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.sirenPhase += dt * 12;
        return;
      }

    // Predict player position
    const leadTime = cfg.flying ? 0.6 : 0.35;
    let tx = player.x + player.vx * leadTime;
    let ty = player.y + player.vy * leadTime;

    // Interceptors try to flank (aim ahead + to the side)
    if (this.typeId === 'interceptor' || this.typeId === 'undercover' || this.typeId === 'federal') {
      const perpX = -player.vy / (Math.hypot(player.vx, player.vy) || 1);
      const perpY =  player.vx / (Math.hypot(player.vx, player.vy) || 1);
      tx += perpX * this.flankOffset;
      ty += perpY * this.flankOffset;
    }

    let dx = tx - this.x;
    let dy = ty - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    dx /= dist;
    dy /= dist;

    // Accelerate toward target
    const accel = cfg.accel;
    this.vx += dx * accel * dt;
    this.vy += dy * accel * dt;

    // Friction
    this.vx *= Math.pow(0.93, dt * 60);
    this.vy *= Math.pow(0.93, dt * 60);

    // Speed clamp
    const sp = Math.hypot(this.vx, this.vy);
    const maxSp = cfg.speed * (cfg.flying ? 1.3 : 1);
    if (sp > maxSp) {
      this.vx = (this.vx / sp) * maxSp;
      this.vy = (this.vy / sp) * maxSp;
    }

    // Move
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Detect heavy bump → enter recover
    // (checks distance to player; if very overlapped and moving fast, back off)
    const pdx = player.x - this.x;
    const pdy = player.y - this.y;
    const pd  = Math.hypot(pdx, pdy);
    if (pd < this.radius + player.radius - 4) {
      const relSp = Math.hypot(player.vx - this.vx, player.vy - this.vy);
      if (relSp > 200) {
        this.recoverTimer = 0.6;
      }
    }

    // Rotate
    if (sp > 10) {
      const target = Math.atan2(this.vy, this.vx);
      let diff = target - this.angle;
      while (diff > Math.PI)  diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.angle += diff * Math.min(1, dt * 6);
    }

    // Building avoidance (simple push-out)
    if (!cfg.flying && world) {
      const hit = world.collidesCircle(this.x, this.y, this.radius);
      if (hit) {
        const nx = Math.max(hit.x, Math.min(this.x, hit.x + hit.w));
        const ny = Math.max(hit.y, Math.min(this.y, hit.y + hit.h));
        let px = this.x - nx;
        let py = this.y - ny;
        const pd = Math.hypot(px, py) || 0.001;
        const push = this.radius - pd;
        this.x += (px / pd) * push;
        this.y += (py / pd) * push;
        this.vx *= 0.4;
        this.vy *= 0.4;
      }
    }

    // Siren animation
    this.sirenPhase += dt * 12;
  }

  draw(ctx, night = 0.5) {
    const cfg = this.cfg;
    ctx.save();
    ctx.translate(this.x,this.y);
    if (cfg.flying) {
      drawHelicopter(ctx,{angle:this.angle,phase:performance.now()*0.02,reduced:Camera.reduced});
      ctx.restore();
      return;
    }
    ctx.rotate(this.angle);
    drawVehicle(ctx,{kind:policeShape(this.typeId),color:cfg.color,accent:cfg.accent,
      police:true,siren:!cfg.stealth||this.closeToPlayer,phase:this.sirenPhase,
      reduced:Camera.reduced,health:this.health/this.maxHealth,night});
    if (this.health < this.maxHealth) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(-15,-this.radius-12,30,4);
      ctx.fillStyle = '#ff0066';
      ctx.fillRect(-15,-this.radius-12,30*Math.max(0,this.health/this.maxHealth),4);
    }
    ctx.restore();
  }
}

// ===== Cops Manager =====
export class CopsManager {
  constructor(world, random = Math.random) {
    this.world = world;
    this.random = random;
    this.cops = [];
    this.spawnTimer = 0;
    this.roadblockTimer = 0;
    this.activeCount = 0;
    this.nearbyGroundCount = 0;
  }

  reset() {
    this.cops = [];
    this.spawnTimer = 0;
    this.roadblockTimer = 0;
    this.activeCount = 0;
    this.nearbyGroundCount = 0;
  }

  // Count only nearby units as active; distant police cannot arrest the player.
  update(dt, player) {
    const heat = Heat.stars;
    const cap = Math.floor(Math.max(2, maxCopsForHeat(heat)));

    for (let i = this.cops.length - 1; i >= 0; i--) {
      const c = this.cops[i];
      const distance = Math.hypot(c.x - player.x, c.y - player.y);
      if (distance > (c.cfg.static ? 1100 : 1600)) {
        this.cops.splice(i, 1);
        continue;
      }
      c.update(dt, player, this.world);
      handleCarCollision(player, c, dt);
      c.closeToPlayer = Math.hypot(c.x - player.x, c.y - player.y) < 260;
      if (c.health <= 0) {
        Glitch.trigger(20);
        Camera.addShake(12);
        Heat.addHeat(0.4);
        this.cops.splice(i, 1);
      }
    }

    this.activeCount = this.cops.filter(c => Math.hypot(c.x - player.x, c.y - player.y) <= 650).length;
    this.nearbyGroundCount = this.cops.filter(c =>
      !c.cfg.flying && Math.hypot(c.x - player.x, c.y - player.y) <= 150
    ).length;

    // A driver who breaks contact and slows down gets a chance to cool off.
    const speeding = player.speedKmh > 80;
    const pursuit = this.activeCount > 0 || speeding;
    this.spawnTimer += dt;
    if (pursuit && this.spawnTimer > 1.2 && this.cops.length < cap && heat >= 0.4) {
      this.spawnTimer = 0;
      this.spawnCop(player, heat);
    }

    if (heat >= 4 && pursuit && this.cops.length < cap) {
      this.roadblockTimer += dt;
      if (this.roadblockTimer > 8) {
        this.roadblockTimer = 0;
        this.spawnRoadblock(player, cap - this.cops.length);
      }
    } else {
      this.roadblockTimer = 0;
    }
  }

  // Never spawn inside buildings, outside the map or on another ground unit.
  canSpawn(x, y, cfg) {
    const margin = Math.max(50, cfg.radius);
    if (x < margin || y < margin || x > this.world.w - margin || y > this.world.h - margin) return false;
    if (!cfg.flying && this.world.collidesCircle(x, y, cfg.radius)) return false;
    return !this.cops.some(c => Boolean(c.cfg.flying) === Boolean(cfg.flying) &&
      Math.hypot(c.x - x, c.y - y) < c.radius + cfg.radius + 12);
  }

  spawnCop(player, heat) {
    const typeId = pickCopType(heat);
    const cfg = COP_TYPES[typeId];
    for (let i = 0; i < 24; i++) {
      const angle = this.random() * Math.PI * 2;
      const dist = 700 + this.random() * 300;
      const x = player.x + Math.cos(angle) * dist;
      const y = player.y + Math.sin(angle) * dist;
      if (!this.canSpawn(x, y, cfg)) continue;
      this.cops.push(new Cop(typeId, x, y));
      return true;
    }
    return false;
  }

  spawnRoadblock(player, slots = 3) {
    const sp = Math.hypot(player.vx, player.vy);
    if (sp < 60 || slots <= 0) return 0;
    const tx = player.x + player.vx / sp * 500;
    const ty = player.y + player.vy / sp * 500;
    const perpX = -player.vy / sp;
    const perpY = player.vx / sp;
    let placed = 0;
    for (const off of [0, -90, 90]) {
      if (placed >= slots) break;
      const x = tx + perpX * off;
      const y = ty + perpY * off;
      if (!this.canSpawn(x, y, COP_TYPES.roadblock)) continue;
      this.cops.push(new Cop('roadblock', x, y));
      placed++;
    }
    if (placed > 0) Glitch.trigger(10);
    return placed;
  }

  draw(ctx, night = 0.5) {
    for (const c of this.cops) c.draw(ctx, night);
  }

  drawOnRadar(ctx, player, cx, cy, radarR) {
    // Draw cop blips on a minimap around player
    for (const c of this.cops) {
      const dx = c.x - player.x;
      const dy = c.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 2000) continue;
      const nx = (dx / 2000) * radarR;
      const ny = (dy / 2000) * radarR;
      ctx.fillStyle = c.cfg.accent;
      ctx.shadowColor = c.cfg.accent;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(cx + nx, cy + ny, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }
}
