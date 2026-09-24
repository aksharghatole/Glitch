// Player car — twin-stick movement. Rotates to face velocity.

import { Input } from './input.js';

export class Car {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;          // facing direction (radians)
    this.radius = 22;
    this.accel = 900;        // px/s^2
    this.maxSpeed = 420;     // px/s
    this.friction = 0.9;
    this.health = 100;
    this.maxHealth = 100;
    this.nitro = 100;
    this.nitroActive = false;
  }

  update(dt) {
    Input.update();
    const ax = Input.axis.x;
    const ay = Input.axis.y;

    if (ax !== 0 || ay !== 0) {
      this.vx += ax * this.accel * dt;
      this.vy += ay * this.accel * dt;
    }

    // Friction (only when not accelerating)
    if (ax === 0 && ay === 0) {
      this.vx *= Math.pow(this.friction, dt * 60);
      this.vy *= Math.pow(this.friction, dt * 60);
    }

    // Clamp speed
    const speed = Math.hypot(this.vx, this.vy);
    const max = this.nitroActive ? this.maxSpeed * 1.7 : this.maxSpeed;
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
  }

  get speedKmh() {
    return Math.round(Math.hypot(this.vx, this.vy) * 0.35);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(3, 5, 26, 16, 0, 0, Math.PI * 2);
    ctx.fill();

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

    // Accent stripe
    ctx.fillStyle = '#ff00d4';
    ctx.fillRect(-16, -2, 6, 4);

    ctx.restore();
  }
}