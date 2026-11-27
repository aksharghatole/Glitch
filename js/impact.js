// Local impact accents: sparks, metal fragments and short expanding shock rings.
// Visual only: no changes to simulation speed, damage or input.
export class ImpactEffects {
  constructor(random = Math.random, maxParticles = 160) {
    this.random = random;
    this.maxParticles = maxParticles;
    this.reduced = false;
    this.reset();
  }

  reset() {
    this.particles = [];
    this.rings = [];
  }

  setReducedMotion(value) {
    this.reduced = Boolean(value);
    if (this.reduced) this.reset();
  }

  hit(x, y, nx, ny, speed, color = '#ffbe65') {
    if (this.reduced || ![x, y, nx, ny, speed].every(Number.isFinite) || speed < 50) return;
    const power = Math.min(1, speed / 420);
    const normal = Math.atan2(ny, nx);
    const count = Math.min(24, Math.ceil(5 + power * 19));
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) this.particles.shift();
      const angle = normal + (this.random() - 0.5) * Math.PI * 1.7;
      const velocity = (60 + this.random() * 230) * (0.5 + power);
      const life = 0.12 + this.random() * 0.32;
      this.particles.push({ x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity,
        life, maxLife: life, size: 1 + this.random() * 2.5, color: i % 4 === 0 ? '#fff3d0' : color,
        fragment: i % 3 === 0 });
    }
    if (speed >= 180) {
      if (this.rings.length >= 8) this.rings.shift();
      this.rings.push({ x, y, age: 0, life: 0.24, power, color });
    }
  }

  update(dt) {
    if (!(dt > 0) || !Number.isFinite(dt)) return;
    const drag = Math.exp(-5 * dt);
    for (const p of this.particles) {
      p.x += p.vx * (1 - drag) / 5;
      p.y += p.vy * (1 - drag) / 5;
      p.vx *= drag;
      p.vy *= drag;
      p.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const ring of this.rings) ring.age += dt;
    this.rings = this.rings.filter(ring => ring.age < ring.life);
  }

  draw(ctx) {
    if (this.reduced || (!this.particles.length && !this.rings.length)) return;
    ctx.save();
    for (const r of this.rings) {
      const t = r.age / r.life;
      ctx.globalAlpha = (1 - t) * 0.65;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 1 + 2 * (1 - t);
      ctx.beginPath();
      ctx.arc(r.x, r.y, 10 + t * (32 + r.power * 42), 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      if (p.fragment) {
        ctx.fillRect(p.x, p.y, p.size * 2, p.size);
      } else {
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

export const Impact = new ImpactEffects();
