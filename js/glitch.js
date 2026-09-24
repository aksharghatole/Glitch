// Full-screen glitch FX bursts.

export const Glitch = {
  pulse: 0,

  trigger(amount = 12) {
    this.pulse = Math.max(this.pulse, amount);
  },

  update() {
    if (this.pulse > 0) this.pulse--;
  },

  draw(ctx, W, H) {
    if (this.pulse <= 0) return;
    const a = this.pulse / 20;

    ctx.save();
    ctx.globalAlpha = a;

    // Horizontal glitch bands
    for (let i = 0; i < 3; i++) {
      const y = Math.random() * H;
      const h = 3 + Math.random() * 6;
      ctx.fillStyle = i % 2 === 0 ? '#ff00d4' : '#00ffff';
      ctx.fillRect(0, y, W, h);
    }

    // RGB split bar
    const y2 = Math.random() * H;
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255, 0, 212, 0.35)';
    ctx.fillRect(-4, y2, W, 8);
    ctx.fillStyle = 'rgba(0, 255, 136, 0.35)';
    ctx.fillRect(4, y2, W, 8);
    ctx.globalCompositeOperation = 'source-over';

    ctx.restore();
  },
};