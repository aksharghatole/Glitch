// Player car — twin-stick movement + nitro.

import { Input } from './input.js';
import { Glitch } from './glitch.js';
import { Camera } from './camera.js';
import { drawVehicle } from './vehicle-art.js';

export class Car {
  constructor(x, y) {
    this.momentum = 1.6;   // >1 = heavier, shoves cops harder
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.radius = 22;
    this.accel = 900;
    this.maxSpeed = 420;
    this.friction = 0.9;
    this.drifting = false;

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
    const nitroKey = Input.keys['shift'] || Input.mouse.down || Input.nitroHeld;
    const wantBoost = nitroKey && this.nitro > 1;
    const beforeSpeed = Math.hypot(this.vx, this.vy);
    const steering = Math.hypot(ax, ay);
    const turn = beforeSpeed > 0 && steering > 0 ?
      (this.vx * ax + this.vy * ay) / (beforeSpeed * steering) : 1;
    this.drifting = Boolean((Input.keys[' '] || Input.driftHeld) && !wantBoost &&
      !this.airborne && beforeSpeed > 130 && steering > 0.15 && turn < 0.94);

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
      this.boostFxTimer *= Math.pow(0.9, dt * 60);
    }

    // Acceleration
    if (ax !== 0 || ay !== 0) {
      const boost = this.nitroActive ? this.boostMultiplier : 1;
      const grip = this.drifting ? 0.48 : 1;
      this.vx += ax * this.accel * boost * grip * dt;
      this.vy += ay * this.accel * boost * grip * dt;
      if (this.drifting) {
        const drag = Math.exp(-0.35 * dt);
        this.vx *= drag;
        this.vy *= drag;
      }
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
      const target = this.drifting ? Math.atan2(ay, ax) : Math.atan2(this.vy, this.vx);
      let diff = target - this.angle;
      while (diff > Math.PI)  diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.angle += diff * (1 - Math.exp(-(this.drifting ? 5 : 10) * dt));
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
            this.drifting = false;
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

  draw(ctx, night = 0.5) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(3,5,26+this.z*0.1,16+this.z*0.05,0,0,Math.PI*2);
    ctx.fill();
    ctx.translate(0,-this.z);
    ctx.rotate(this.angle);
    drawVehicle(ctx, {kind:'sport',color:'#1089a3',accent:'#65faff',player:true,
      boost:this.nitroActive,reduced:Camera.reduced,phase:performance.now()/1000,
      health:this.health/this.maxHealth,night});
    ctx.restore();
  }
}
