// City + environment objects + day/night tint.

import { CITIES } from '../data/cities.js';

export class World {
  constructor(cityId) {
    this.city = CITIES[cityId] || CITIES.neon_district;
    this.w = this.city.width;
    this.h = this.city.height;
    this.roadWidth = this.city.roadWidth;
    this.blockSize = this.city.blockSize;
    this.buildings = [];
    this.landmarks = this.city.landmarks || [];
    this.nitroStrips = this.city.nitroStrips || [];
    this.ramps = this.city.ramps || [];
    this.tunnels = this.city.tunnels || [];
    this.time = 0;
    this.dayNight = 0; // 0..1
    this._buildBuildings();
  }

  _buildBuildings() {
    const { blockSize, roadWidth, width, height } = this.city;
    const stride = blockSize + roadWidth;
    const cols = Math.ceil(width / stride);
    const rows = Math.ceil(height / stride);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * stride + roadWidth;
        const y = r * stride + roadWidth;
        const w = blockSize;
        const h = blockSize;
        if (x + w > width || y + h > height) continue;

        const pad = 40;
        this.buildings.push({
          x: x + pad,
          y: y + pad,
          w: w - pad * 2,
          h: h - pad * 2,
        });
      }
    }
  }

  update(dt) {
    this.time += dt;
    // Full cycle ~90 seconds
    this.dayNight = (Math.sin(this.time / 45) + 1) / 2;
  }

  collidesCircle(cx, cy, radius) {
    for (const b of this.buildings) {
      const nx = Math.max(b.x, Math.min(cx, b.x + b.w));
      const ny = Math.max(b.y, Math.min(cy, b.y + b.h));
      const dx = cx - nx;
      const dy = cy - ny;
      if (dx * dx + dy * dy < radius * radius) return b;
    }
    return null;
  }

  draw(ctx) {
    const { palette } = this.city;

    // Ground
    ctx.fillStyle = palette.ground;
    ctx.fillRect(0, 0, this.w, this.h);

    this._drawRoadLines(ctx, palette);
    this._drawNitroStrips(ctx);
    this._drawRamps(ctx);

    // Buildings
    for (const b of this.buildings) {
      ctx.fillStyle = palette.building;
      ctx.fillRect(b.x, b.y, b.w, b.h);

      ctx.strokeStyle = palette.buildingEdge;
      ctx.lineWidth = 2;
      ctx.shadowColor = palette.buildingEdge;
      ctx.shadowBlur = 10;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.shadowBlur = 0;

      ctx.fillStyle = 'rgba(0, 255, 255, 0.15)';
      const step = 34;
      for (let wx = b.x + 12; wx < b.x + b.w - 12; wx += step) {
        for (let wy = b.y + 12; wy < b.y + b.h - 12; wy += step) {
          if (((wx + wy) / step) % 3 < 1) ctx.fillRect(wx, wy, 14, 14);
        }
      }
    }

    for (const lm of this.landmarks) this._drawLandmark(ctx, lm);

    // Tunnels (dark overlays — drawn last)
    for (const t of this.tunnels) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(t.x, t.y, t.w, t.h);
      ctx.strokeStyle = '#0ff';
      ctx.shadowColor = '#0ff';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2;
      ctx.strokeRect(t.x, t.y, t.w, t.h);
      ctx.shadowBlur = 0;
    }

    // Border
    ctx.strokeStyle = 'rgba(255, 0, 212, 0.6)';
    ctx.lineWidth = 6;
    ctx.shadowColor = '#ff00d4';
    ctx.shadowBlur = 20;
    ctx.strokeRect(0, 0, this.w, this.h);
    ctx.shadowBlur = 0;

    // Day/night tint overlay (canvas-level, done in main)
    this._dayNightTint = this.dayNight;
  }

  _drawRoadLines(ctx, palette) {
    const { width, height, roadWidth, blockSize } = this.city;
    const stride = blockSize + roadWidth;
    ctx.strokeStyle = palette.roadLine;
    ctx.lineWidth = 3;
    ctx.setLineDash([24, 20]);

    for (let r = 0; r * stride <= height; r++) {
      const y = r * stride + roadWidth / 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    for (let c = 0; c * stride <= width; c++) {
      const x = c * stride + roadWidth / 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  _drawNitroStrips(ctx) {
    for (const s of this.nitroStrips) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 200, 255, 0.35)';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 25;
      ctx.fillRect(s.x, s.y, s.w, s.h);

      // Chevrons
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 3;
      const step = 30;
      for (let i = 0; i < s.w; i += step) {
        ctx.beginPath();
        ctx.moveTo(s.x + i, s.y + 4);
        ctx.lineTo(s.x + i + 12, s.y + s.h / 2);
        ctx.lineTo(s.x + i, s.y + s.h - 4);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  _drawRamps(ctx) {
    for (const r of this.ramps) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 0, 212, 0.25)';
      ctx.strokeStyle = '#ff00d4';
      ctx.shadowColor = '#ff00d4';
      ctx.shadowBlur = 18;
      ctx.lineWidth = 3;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeRect(r.x, r.y, r.w, r.h);

      // Arrow
      ctx.fillStyle = '#ff00d4';
      ctx.font = 'bold 20px Courier New';
      ctx.textAlign = 'center';
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2 + 7;
      ctx.fillText('▲', cx, cy);
      ctx.restore();
    }
  }

  _drawLandmark(ctx, lm) {
    const colors = { tollgate: '#ff00d4', church: '#00ff88', parking: '#00ffff' };
    const c = colors[lm.type] || '#0ff';
    ctx.strokeStyle = c;
    ctx.shadowColor = c;
    ctx.shadowBlur = 18;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(lm.x, lm.y, 60, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = c;
    ctx.font = 'bold 14px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(lm.label, lm.x, lm.y + 4);
  }
}