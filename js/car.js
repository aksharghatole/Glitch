// Player car — twin-stick movement + nitro.

import { Input } from './input.js';
import { Glitch } from './glitch.js';
import { Camera } from './camera.js';

export class Car {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.radius = 22;
    this.accel = 900;
    this.maxSpeed = 420;
    this.friction = 0.9;

    this.health = 100;
    this.maxHealth = 100;

    // Nitro
    this.nitro = 100;          // 0..100
    this.nitroActive = false;
    this.nitroDrainRate = 35;  // per second
    this.nitroRegenRate = 4;   // per second while driving fast
    this.boostMultiplier = 1.75;
    this.boostFxTimer = 0;

    // Airborne
    this.airborne = false;
    this.z = 0;                // visual height
    this.vz = 0;
    this.gravity = 1400;
  }

  update(dt, world) {
    Input.update();
    const ax = Input.axis.x;
    const ay = Input.axis.y;

    // Nitro input
    const nitroKey = Input.keys['shift'] || Input.mouse.down;
    const wantBoost = nitroKey && this.nitro > 1;

    if (wantBoost && !this.nitroActive) {
      Glitch.trigger(10);
      Camera.addShake(6);
    }
    this.nitroActive = wantBoost;

    if (this.nitroActive) {
      this.nitro = Math.max(0, this.nitro - this.nitroDrainRate * dt);
      this.boostFxTimer = 1;
    } else {
      // Regen when moving decently fast
      const sp = Math.hypot(this.vx, this.vy);
      if (sp > 150) {
        this.nitro = Math.min(100, this.nitro + this.nitroRegenRate * dt);
      }
      this.boostFxTimer *= 0.9;
    }

    // Acceleration
    if (ax !== 0 || ay !== 0) {
      const boost = this.nitroActive ? this.boostMultiplier : 1;
      this.vx += ax * this.accel * boost * dt;
      this.vy += ay * this.accel * boost * dt;
    }

    // Friction
    if (ax === 0 && ay === 0) {
      this.vx *= Math.pow(this.friction, dt * 60);
      this.vy *= Math.pow(this.friction, dt * 60);
    }

    // Speed clamp
    const speed = Math.hypot(this.vx, this.vy);
    const max = this.maxSpeed * (this.nitroActive ? this.boostMultiplier : 1);
    if (speed > max) {
      this.vx = (this.vx / speed) * max;
      this.vy = (this.vy / speed) * max;
    }

    // Move
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Rotate to face velocity
    if (speed > 6) {
      const target = Math.atan2(this.vy, this.vx);
      let diff = target - this.angle;
      while (diff > Math.PI)  diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.angle += diff * Math.min(1, dt * 10);
    }

    // Airborne physics
    if (this.airborne) {
      this.vz -= this.gravity * dt;
      this.z += this.vz * dt;
      if (this.z <= 0) {
        this.z = 0;
        this.airborne = false;
        this.vz = 0;
        Camera.addShake(10);
        Glitch.trigger(12);
      }
    }

    // Nitro strip pickup
    if (world && world.nitroStrips) {
      for (const s of world.nitroStrips) {
        if (this.x > s.x && this.x < s.x + s.w &&
            this.y > s.y && this.y < s.y + s.h) {
          if (this.nitro < 100) Glitch.trigger(6);
          this.nitro = 100;
        }
      }
    }

    // Ramp pickup
    if (world && world.ramps && !this.airborne) {
      for (const r of world.ramps) {
        if (this.x > r.x && this.x < r.x + r.w &&
            this.y > r.y && this.y < r.y + r.h) {
          const sp = Math.hypot(this.vx, this.vy);
          if (sp > 200) {
            this.airborne = true;
            this.vz = 420;
            Camera.addShake(8);
            Glitch.trigger(10);
          }
        }
      }
    }
  }

  get speedKmh() {
    return Math.round(Math.hypot(this.vx, this.vy) * 0.35);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y - this.z);

    // Shadow (offset by height)
    ctx.save();
    ctx.translate(0, this.z);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(3, 5, 26 + this.z * 0.1, 16 + this.z * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.rotate(this.angle);

    // Boost trail
    if (this.nitroActive) {
      ctx.fillStyle = 'rgba(0, 200, 255, 0.6)';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 30;
      const t = 30 + Math.random() * 20;
      ctx.beginPath();
      ctx.moveTo(-18, -8);
      ctx.lineTo(-18 - t, 0);
      ctx.lineTo(-18, 8);
      ctx.closePath();
      ctx.fill();
    }

    // Glow
    ctx.shadowColor = '#0ff';
    ctx.shadowBlur = 20;

    // Body
    ctx.fillStyle = '#0ff';
    ctx.beginPath();
    ctx.moveTo(26, 0);
    ctx.lineTo(-10, -16);
    ctx.lineTo(-18, -10);
    ctx.lineTo(-18, 10);
    ctx.lineTo(-10, 16);
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#05010f';
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, -8);
    ctx.lineTo(-10, 0);
    ctx.lineTo(-4, 8);
    ctx.closePath();
    ctx.fill();

    // Accent
    ctx.fillStyle = '#ff00d4';
    ctx.fillRect(-16, -2, 6, 4);

    ctx.restore();
  }
}