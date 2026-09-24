// Cop spawning + AI + rendering.

import { COP_TYPES, pickCopType, maxCopsForHeat } from '../data/cops-config.js';
import { Heat } from './heat.js';
import { Glitch } from './glitch.js';
import { Camera } from './camera.js';
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

    if (cfg.static) {
      // roadblock — doesn't move
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

  draw(ctx) {
    const cfg = this.cfg;

    if (cfg.flying) {
      // Helicopter — shadow + body offset above
      ctx.save();
      ctx.translate(this.x, this.y);

      // Spotlight toward player
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#ffee00';
      ctx.beginPath();
      ctx.arc(0, 0, 160, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Body
      ctx.fillStyle = cfg.color;
      ctx.shadowColor = cfg.accent;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();

      // Rotor (spinning line)
      const rotorAng = performance.now() * 0.02;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(rotorAng) * 34, Math.sin(rotorAng) * 34);
      ctx.lineTo(-Math.cos(rotorAng) * 34, -Math.sin(rotorAng) * 34);
      ctx.stroke();

      // Blinking light
      const blink = (Math.sin(this.sirenPhase) + 1) / 2;
      ctx.fillStyle = blink > 0.5 ? '#ff0000' : '#0000ff';
      ctx.beginPath();
      ctx.arc(0, -20, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(3, 5, this.radius + 4, this.radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = cfg.color;
    ctx.shadowColor = cfg.accent;
    ctx.shadowBlur = 14;

    // Draw a car-like shape (rect for simplicity per type)
    const L = this.radius * 1.3;
    const W = this.radius * 0.9;
    ctx.fillRect(-L/2, -W/2, L, W);

    // Undercover has no visible marker until close
    const isStealthHidden = cfg.stealth && !this.closeToPlayer;

    // Light bar (red/blue flash) — hidden if stealth
    if (!isStealthHidden) {
      const blink = Math.sin(this.sirenPhase) > 0;
      ctx.shadowBlur = 20;
      ctx.fillStyle = blink ? '#ff0022' : '#0011ff';
      ctx.shadowColor = blink ? '#ff0022' : '#0011ff';
      ctx.fillRect(-L/2 + 2, -W/2 - 4, L - 4, 4);
    }

    // Accent stripe
    ctx.shadowBlur = 0;
    ctx.fillStyle = cfg.accent;
    ctx.fillRect(-2, -W/2, 4, W);

    // Health bar
    if (this.health < this.maxHealth) {
      const barW = 30;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(-barW/2, -this.radius - 12, barW, 4);
      ctx.fillStyle = '#ff0066';
      ctx.fillRect(-barW/2, -this.radius - 12, barW * (this.health / this.maxHealth), 4);
    }

    ctx.restore();
  }
}

// ===== Cops Manager =====
export class CopsManager {
  constructor(world) {
    this.world = world;
    this.cops = [];
    this.spawnTimer = 0;
    this.roadblockTimer = 0;
    this.activeCount = 0;
  }

  reset() {
    this.cops = [];
    this.spawnTimer = 0;
    this.roadblockTimer = 0;
  }

  // Called every frame
  update(dt, player) {
    const heat = Heat.stars;
    const maxCops = maxCopsForHeat(heat);

    // Spawn new cops
    this.spawnTimer += dt;
    if (this.spawnTimer > 1.2 && this.cops.length < maxCops && heat >= 1) {
      this.spawnTimer = 0;
      this.spawnCop(player, heat);
    }

    // Roadblocks (heat 4+)
    if (heat >= 4) {
      this.roadblockTimer += dt;
      if (this.roadblockTimer > 8) {
        this.roadblockTimer = 0;
        this.spawnRoadblock(player);
      }
    }

    // Update each cop
    for (let i = this.cops.length - 1; i >= 0; i--) {
      const c = this.cops[i];
      c.update(dt, player, this.world);

      // Collision with player
      handleCarCollision(player, c, dt);

      // Stealth visibility check
      const d = Math.hypot(c.x - player.x, c.y - player.y);
      c.closeToPlayer = d < 260;

      // Remove dead
      if (c.health <= 0) {
        Glitch.trigger(20);
        Camera.addShake(12);
        Heat.addHeat(0.4);
        this.cops.splice(i, 1);
      }
    }

    this.activeCount = this.cops.length;
  }

  spawnCop(player, heat) {
    const typeId = pickCopType(heat);
    const angle = Math.random() * Math.PI * 2;
    const dist = 700 + Math.random() * 300;
    let x = player.x + Math.cos(angle) * dist;
    let y = player.y + Math.sin(angle) * dist;

    // Clamp inside world
    x = Math.max(50, Math.min(this.world.w - 50, x));
    y = Math.max(50, Math.min(this.world.h - 50, y));

    this.cops.push(new Cop(typeId, x, y));
  }

  spawnRoadblock(player) {
    // Place ahead of player's velocity
    const sp = Math.hypot(player.vx, player.vy) || 1;
    const ahead = 500;
    const tx = player.x + (player.vx / sp) * ahead;
    const ty = player.y + (player.vy / sp) * ahead;

    const count = 3;
    const perpX = -player.vy / sp;
    const perpY =  player.vx / sp;

    for (let i = 0; i < count; i++) {
      const off = (i - (count - 1) / 2) * 90;
      const x = tx + perpX * off;
      const y = ty + perpY * off;
      if (x < 50 || y < 50 || x > this.world.w - 50 || y > this.world.h - 50) continue;
      this.cops.push(new Cop('roadblock', x, y));
    }
    Glitch.trigger(10);
  }

  draw(ctx) {
    for (const c of this.cops) c.draw(ctx);
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