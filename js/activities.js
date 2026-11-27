// Time trials follow the actual road grid; ordered checkpoints only.
const point=(x,y)=>({x,y});
export const TRIALS = [
  {id:'neon-loop',city:'neon_district',name:'Neon Loop',limit:38,reward:500,
    points:[point(580,580),point(1620,580),point(1620,1620),point(580,1620),point(580,580)]},
  {id:'midnight-run',city:'neon_district',name:'Midnight Run',limit:60,reward:850,
    points:[point(580,580),point(3180,580),point(3180,2140),point(1100,2140),point(1100,1100)]},
];
export const CHECKPOINT_RADIUS=54;
export class TimeTrial {
  constructor(route) { this.route=route; this.state='countdown'; this.countdown=3; this.elapsed=0; this.index=1; this.result=null; }
  get target() { return this.state==='running' ? this.route.points[this.index] : null; }
  get remaining() { return Math.max(0,this.route.limit-this.elapsed); }
  update(dt, car) {
    if (!(dt>0) || !Number.isFinite(dt)) return;
    if (this.state==='countdown') {
      this.countdown=Math.max(0,this.countdown-dt);
      if (this.countdown===0) this.state='running';
      return;
    }
    if (this.state!=='running') return;
    this.elapsed+=dt;
    if (this.elapsed>=this.route.limit) { this.fail('TIME EXPIRED'); return; }
    const target=this.target;
    if (Math.hypot(car.x-target.x,car.y-target.y)<=CHECKPOINT_RADIUS) {
      this.index++;
      if(this.index>=this.route.points.length) {
        this.state='complete';
        this.result={success:true,elapsed:this.elapsed,reward:this.route.reward};
      }
    }
  }
  fail(reason) {
    if (this.state==='running'||this.state==='countdown') {
      this.state='failed';
      this.result={success:false,reason,reward:0};
    }
  }
  draw(ctx) {
    const p=this.target;
    if(!p) return;
    ctx.save();
    ctx.strokeStyle='#ffe66b';ctx.lineWidth=3;
    ctx.fillStyle='rgba(255,230,107,0.13)';
    ctx.beginPath();ctx.arc(p.x,p.y,CHECKPOINT_RADIUS,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#fff0a5';ctx.font='bold 15px monospace';ctx.textAlign='center';
    ctx.fillText(this.index===this.route.points.length-1?'FINISH':String(this.index),p.x,p.y+5);
    ctx.restore();
  }
}
export function recordTrial(save,route,result) {
  if(!result?.success||!Number.isFinite(result.elapsed)||result.elapsed<=0) return null;
  const records=save.trialRecords && typeof save.trialRecords==='object' ? save.trialRecords : {};
  save.trialRecords=records;
  const previous=records[route.id];
  const personalBest=!Number.isFinite(previous)||result.elapsed<previous;
  if(personalBest) records[route.id]=result.elapsed;
  save.cash=(Number.isFinite(save.cash)?Math.max(0,save.cash):0)+route.reward;
  return {personalBest,best:records[route.id],reward:route.reward};
}
