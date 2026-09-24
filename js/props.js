// Simple rammable props: parked cars & trash piles. Purely for raising heat.

import { Heat } from './heat.js';
import { Glitch } from './glitch.js';
import { Camera } from './camera.js';

export class Props {
  constructor(world) {
    this.world = world;
    this.items = [];
    this.spawn(world);
  }

  spawn(world) {
    const count = 40;
    for (let i = 0; i < count; i++) {
      // Place along road strips (avoid buildings)
      let x, y, tries = 0;
      do {
        x = 100 + Math.random() * (world.w - 200);
        y = 100 + Math.random() * (world.h - 200);
        tries++;
      } while (world.collidesCircle(x, y, 30) && tries < 20);

      this.items.push({
        x, y,
        w: 30, h: 18,
        angle: Math.random() * Math.PI * 2,
        destroyed: false,
      });
    }
  }

  update(dt, player) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      if (it.destroyed) continue;

      // circle vs AABB
      const cx = player.x, cy = player.y, r = player.radius;
      const nx = Math.max(it.x - it.w/2, Math.min(cx, it.x + it.w/2));
      const ny = Math.max(it.y - it.h/2, Math.min(cy, it.y + it.h/2));
      const dx = cx - nx, dy = cy - ny;

      if (dx*dx + dy*dy < r*r) {
        // Only explode if we're moving fast enough
        const sp = Math.hypot(player.vx, player.vy);
        if (sp > 120) {
          it.destroyed = true;
          Heat.addHeat(1.5);
          Glitch.trigger(16);
          Camera.addShake(10);
          player.health = Math.max(0, player.health - 3);
        }
      }
    }
  }

  draw(ctx) {
    for (const it of this.items) {
      if (it.destroyed) continue;
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(it.angle);

      ctx.fillStyle = 'rgba(255, 180, 0, 0.9)';
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 10;
      ctx.fillRect(-it.w/2, -it.h/2, it.w, it.h);

      ctx.fillStyle = '#05010f';
      ctx.fillRect(-it.w/2 + 4, -it.h/2 + 4, 6, it.h - 8);

      ctx.restore();
    }
  }
}