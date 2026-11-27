// Original procedural top-down vehicle artwork, facing local +X.
// No assets or changes to collision geometry.
const SHAPES = {
  sport: { length: 46, width: 26, cabin: 0.05, nose: 5 },
  sedan: { length: 36, width: 21, cabin: 0.05, nose: 4 },
  interceptor: { length: 38, width: 20, cabin: -0.05, nose: 6 },
  suv: { length: 45, width: 30, cabin: 0.16, nose: 3 },
  roadblock: { length: 48, width: 32, cabin: 0.1, nose: 3 },
};
const POLICE = { patrol: 'sedan', interceptor: 'interceptor', suv: 'suv',
  roadblock: 'roadblock', undercover: 'sedan', federal: 'interceptor' };
export function vehicleShape(kind) { return { ...(SHAPES[kind] || SHAPES.sedan) }; }
export function policeShape(type) { return POLICE[type] || 'sedan'; }

function poly(ctx, points, color, stroke = null) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const p of points.slice(1)) ctx.lineTo(...p);
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 0.8; ctx.stroke(); }
}

export function drawVehicle(ctx, options = {}) {
  const {kind = 'sedan', color = '#536f91', accent = '#d5e7ef', player = false,
    police = false, siren = false, phase = 0, braking = false,
    boost = false, reduced = false, health = 1, night = 0.5} = options;
  const {length, width, cabin, nose} = vehicleShape(kind);
  const l = length / 2, w = width / 2;
  const dark = Math.max(0, Math.min(1, night));
  ctx.save();
  ctx.lineCap = 'round';
  // Ground glow stays behind the car rather than obscuring its silhouette.
  if (player) {
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = '#00d9ff';
    ctx.beginPath(); ctx.ellipse(0, 0, l + 5, w + 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Low-opacity headlights, only prominent at night.
  if (dark > 0.1) {
    for (const side of [-1, 1]) {
      const y = side * w * 0.64;
      ctx.globalAlpha = 0.06 + dark * 0.1;
      poly(ctx, [[l-1,y-2],[l+32,y-12],[l+39,y+12],[l-1,y+2]], '#c8edff');
    }
    ctx.globalAlpha = 1;
  }
  if (boost && player) {
    const flame = reduced ? 10 : 18 + 5 * Math.sin(phase * 17);
    for (const side of [-1, 1]) {
      const y = side * w * 0.42;
      poly(ctx, [[-l,y-3],[-l-flame,y],[-l,y+3]], '#00c5ff');
      poly(ctx, [[-l,y-1.5],[-l-flame*0.55,y],[-l,y+1.5]], '#e0fcff');
    }
  }
  // Four tyres with hub detail.
  for (const x of [-l*0.62,l*0.62]) for (const side of [-1,1]) {
    ctx.fillStyle = '#080b12'; ctx.fillRect(x-4.5, side*(w-1)-3, 9, 6);
    ctx.fillStyle = '#495363'; ctx.fillRect(x-2.4, side*(w-1)-1, 4.8, 2);
  }
  const outline = [[-l,-w+3],[-l+5,-w],[l-nose,-w],[l,-w+4],
    [l,w-4],[l-nose,w],[-l+5,w],[-l,w-3]];
  poly(ctx, outline, '#111724');
  ctx.save(); ctx.scale(0.94,0.89);
  poly(ctx, outline, color, '#a6bdcc');
  ctx.restore();
  // Front hood, glass, roof and rear window.
  poly(ctx, [[l-nose-2,-w*0.62],[l-3,-w*0.62],[l-3,w*0.62],[l-nose-2,w*0.62]], '#29374a');
  const center = cabin*l, f = center+l*0.34, b = center-l*0.32;
  poly(ctx, [[b-4,-w*0.63],[f+4,-w*0.60],[f+4,w*0.60],[b-4,w*0.63]], '#101c2e', '#627d93');
  poly(ctx, [[b,-w*0.52],[f-2,-w*0.52],[f-2,w*0.52],[b,w*0.52]], color);
  ctx.fillStyle = '#8db6c9'; ctx.fillRect(f+1,-w*0.46,1.5,w*0.92);
  ctx.fillStyle = '#263950'; ctx.fillRect(b-3,-w*0.44,2,w*0.88);
  // Side skirt stripes, marker lights and bumper.
  for (const side of [-1,1]) {
    ctx.fillStyle = accent; ctx.fillRect(-l*0.45,side*w*0.82-0.7,l*0.9,1.4);
    ctx.fillStyle = '#e6f7ff'; ctx.fillRect(l-4,side*w*0.67-1.7,3,3.4);
    ctx.fillStyle = braking ? '#ff5867' : '#d92f49';
    ctx.fillRect(-l+1,side*w*0.65-1.7,3,3.4);
  }
  ctx.fillStyle = '#080b12'; ctx.fillRect(-l+1,-w*0.26,2,w*0.52);
  if (player) {
    ctx.fillStyle = '#ff37bd'; ctx.fillRect(-l+5,-1.3,7,2.6);
    ctx.fillStyle = '#d4faff'; ctx.fillRect(l*0.5,-1,5,2);
  }
  if (police && siren) {
    const blink = reduced ? 0 : Math.sin(phase);
    ctx.fillStyle = '#172236'; ctx.fillRect(-3,-w*0.78,6,w*1.56);
    ctx.fillStyle = blink >= 0 ? '#ff6571' : '#862532'; ctx.fillRect(-2,-w*0.7,4,w*0.62);
    ctx.fillStyle = blink <= 0 ? '#61baff' : '#234e98'; ctx.fillRect(-2,w*0.08,4,w*0.62);
  }
  if (kind === 'roadblock') {
    ctx.fillStyle = '#e9b94e';
    for(let j=0;j<3;j++) ctx.fillRect(-l+5,-w+4+j*7,4,3);
  }
  if (health < 0.55) {
    ctx.strokeStyle = '#263141'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(l*0.5,-w*0.7); ctx.lineTo(l*0.2,-w*0.23);
    ctx.lineTo(l*0.55,w*0.05); ctx.stroke();
  }
  ctx.restore();
}

export function drawHelicopter(ctx, {angle=0, phase=0, reduced=false} = {}) {
  ctx.save();
  ctx.globalAlpha=0.1; ctx.fillStyle='#ffe9a3'; ctx.beginPath();
  ctx.arc(0,0,86,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
  ctx.rotate(angle);
  ctx.fillStyle='#090e19'; ctx.fillRect(-39,-3,28,6);
  ctx.fillStyle='#536576'; ctx.fillRect(-37,-10,4,20);
  ctx.fillStyle='#172436'; ctx.beginPath(); ctx.ellipse(4,0,23,13,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#527a94'; ctx.beginPath(); ctx.ellipse(15,0,9,8,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#687887'; ctx.lineWidth=2;
  for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(-10,side*15);ctx.lineTo(15,side*15);ctx.stroke();}
  ctx.save();ctx.rotate(reduced?0:phase);
  ctx.strokeStyle='#aebdcc';ctx.globalAlpha=0.7;ctx.lineWidth=3;
  for(const a of [0,Math.PI/2]){ctx.beginPath();ctx.moveTo(-35*Math.cos(a),-35*Math.sin(a));ctx.lineTo(35*Math.cos(a),35*Math.sin(a));ctx.stroke();}
  ctx.restore();
  ctx.fillStyle='#c5e0ea';ctx.beginPath();ctx.arc(0,0,3,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
