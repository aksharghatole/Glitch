// Bounded world-space skid marks and smoke; purely cosmetic.
export class DriftTrails {
  constructor() { this.reduced = false; this.reset(); }
  reset() { this.marks = []; this.smoke = []; this.previous = null; this.timer = 0; }
  setReducedMotion(value) { this.reduced = Boolean(value); if (this.reduced) this.reset(); }
  update(dt, car = null) {
    for (const m of this.marks) m.life -= dt;
    this.marks = this.marks.filter(m => m.life > 0);
    for (const p of this.smoke) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    this.smoke = this.smoke.filter(p => p.life > 0);
    if (this.reduced || !car?.drifting || car.airborne) {
      this.previous = null; this.timer = 0; return;
    }
    const cs = Math.cos(car.angle), sn = Math.sin(car.angle);
    const wheels = [-10, 10].map(side => ({x:car.x - 15 * cs - side * sn, y:car.y - 15 * sn + side * cs}));
    if (!this.previous) this.previous = wheels;
    else if (Math.hypot(wheels[0].x - this.previous[0].x, wheels[0].y - this.previous[0].y) >= 5) {
      if (Math.hypot(wheels[0].x - this.previous[0].x, wheels[0].y - this.previous[0].y) < 65) {
        for (let n = 0; n < 2; n++) this.marks.push({a:this.previous[n], b:wheels[n], life:3});
        if (this.marks.length > 240) this.marks.splice(0, this.marks.length - 240);
      }
      this.previous = wheels;
    }
    this.timer += dt;
    if (this.timer >= 0.055) {
      this.timer %= 0.055;
      for (const p of wheels) this.smoke.push({...p,vx:-car.vx*0.1,vy:-car.vy*0.1,life:0.55});
      if (this.smoke.length > 64) this.smoke.splice(0,this.smoke.length-64);
    }
  }
  draw(ctx) {
    if (this.reduced || (!this.marks.length && !this.smoke.length)) return;
    ctx.save();
    ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#777589';
    for (const m of this.marks) {
      ctx.globalAlpha = 0.36 * m.life / 3;
      ctx.beginPath(); ctx.moveTo(m.a.x,m.a.y); ctx.lineTo(m.b.x,m.b.y); ctx.stroke();
    }
    ctx.fillStyle = '#a9b7c5';
    for (const p of this.smoke) {
      ctx.globalAlpha = 0.22 * p.life / 0.55;
      ctx.beginPath(); ctx.arc(p.x,p.y,3+13*(1-p.life/0.55),0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
}
export const Trails = new DriftTrails();
