// Camera with boost-aware zoom + shake.

export const Camera = {
  x: 0,
  y: 0,
  zoom: 0.85,
  baseZoom: 0.85,
  boostZoom: 0.75,
  targetZoom: 0.85,
  shake: 0,

  follow(target, dt) {
    const lead = 0.25;
    const tx = target.x + target.vx * lead;
    const ty = target.y + target.vy * lead;

    const lerp = 1 - Math.pow(0.001, dt);
    this.x += (tx - this.x) * lerp;
    this.y += (ty - this.y) * lerp;

    // Zoom pulls back during boost
    this.targetZoom = target.nitroActive ? this.boostZoom : this.baseZoom;
    this.zoom += (this.targetZoom - this.zoom) * lerp * 0.5;

    if (this.shake > 0) this.shake *= 0.9;
    if (this.shake < 0.1) this.shake = 0;
  },

  apply(ctx, W, H) {
    const sx = (Math.random() - 0.5) * this.shake;
    const sy = (Math.random() - 0.5) * this.shake;

    ctx.translate(W / 2 + sx, H / 2 + sy);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  },

  addShake(amount) {
    this.shake = Math.min(20, this.shake + amount);
  },
};