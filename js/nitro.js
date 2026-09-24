// Boost visual FX: speed lines + chromatic aberration.

export const NitroFX = {
  draw(ctx, W, H, car) {
    const t = car.boostFxTimer;
    if (t < 0.05) return;

    ctx.save();
    ctx.globalAlpha = t * 0.9;

    // Speed lines from edges inward
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    const lines = 40;
    for (let i = 0; i < lines; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r1 = 200 + Math.random() * 200;
      const r2 = r1 + 40 + Math.random() * 80;
      const cx = W / 2;
      const cy = H / 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
      ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
      ctx.stroke();
    }

    // Chromatic aberration bands
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255, 0, 212, 0.15)';
    ctx.fillRect(-4, 0, W, H);
    ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
    ctx.fillRect(4, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';

    ctx.restore();
  },
};