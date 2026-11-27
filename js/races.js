// Arcade route-following rivals. They run on the same checkpoint course.
import { TRIALS, TimeTrial } from './activities.js';
import { drawVehicle } from './vehicle-art.js';
export const DIFFICULTIES = {
  rookie: { label:'Rookie', speeds:[150,170,190], multiplier:1 },
  pro: { label:'Pro', speeds:[225,250,280], multiplier:1.5 },
  elite: { label:'Elite', speeds:[300,335,365], multiplier:2 },
};
const COLORS=['#e4a238','#de527c','#8f74db'];
const NAMES=['VEX','NOVA','GHOST'];
export function makeRaces() {
  return TRIALS.flatMap(route=>Object.entries(DIFFICULTIES).map(([difficulty,config])=>({
    ...route,id:route.id+'-'+difficulty,mode:'race',difficulty,
    name:route.name+' / '+config.label,reward:Math.round(route.reward*config.multiplier),
  })));
}
export const RACES=makeRaces();
export const ACTIVITIES=[...TRIALS,...RACES];

export class Rival {
  constructor(route, speed, number) {
    this.route=route;this.speed=speed;this.number=number;
    this.x=route.points[0].x;this.y=route.points[0].y;
    this.index=1;this.angle=0;this.finishTime=null;
    this.delay=0.18+number*0.32;
    this.color=COLORS[number];this.name=NAMES[number];
    this.segment=0;
  }
  update(dt, elapsed) {
    if(this.finishTime!==null || elapsed<=this.delay) return;
    let remaining=Math.min(dt,elapsed-this.delay);
    while(remaining>1e-9 && this.index<this.route.points.length){
      const p=this.route.points[this.index],dx=p.x-this.x,dy=p.y-this.y;
      const dist=Math.hypot(dx,dy);
      if(dist>0)this.angle=Math.atan2(dy,dx);
      // Reduce speed near each corner. This also gives the player a window to overtake.
      const speed=this.speed*(dist<100?0.68:1);
      const step=remaining*speed;
      if(step<dist){
        this.x+=dx/dist*step;this.y+=dy/dist*step;this.segment+=step;remaining=0;
      }else{
        this.x=p.x;this.y=p.y;remaining-=dist/speed;this.index++;this.segment=0;
        if(this.index===this.route.points.length)this.finishTime=elapsed-remaining;
      }
    }
  }
  draw(ctx,night) {
    // Small display offset separates cars visually without changing race progress.
    const offset=(this.number-1)*17;
    ctx.save();ctx.translate(this.x-Math.sin(this.angle)*offset,this.y+Math.cos(this.angle)*offset);
    ctx.rotate(this.angle);drawVehicle(ctx,{kind:'interceptor',color:this.color,accent:'#f8f5ed',night});ctx.restore();
    ctx.save();ctx.font='10px monospace';ctx.textAlign='center';ctx.fillStyle=this.color;
    ctx.fillText(this.name,this.x,this.y-25-this.number*10);ctx.restore();
  }
}
export function playerProgress(route,index,car){
  if(index>=route.points.length)return Infinity;
  const a=route.points[index-1],b=route.points[index];
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
  const projected=((car.x-a.x)*dx+(car.y-a.y)*dy)/len;
  return index+Math.max(0,Math.min(0.999,projected/len));
}
function rivalProgress(rival){
  if(rival.finishTime!==null)return Infinity;
  const a=rival.route.points[rival.index-1],b=rival.route.points[rival.index];
  return rival.index+rival.segment/Math.hypot(b.x-a.x,b.y-a.y);
}
export function racePayout(route,position){
  return Math.round(route.reward*([1,0.65,0.35,0.15][position-1]??0));
}
export class StreetRace extends TimeTrial {
  constructor(route){
    super(route);
    const config=DIFFICULTIES[route.difficulty]||DIFFICULTIES.rookie;
    this.rivals=config.speeds.map((speed,i)=>new Rival(route,speed,i));
    this.position=1;
  }
  update(dt,car){
    const running=this.state==='running';
    super.update(dt,car);
    if(!running||!(dt>0)||!Number.isFinite(dt))return;
    if(this.state==='failed')return;
    for(const rival of this.rivals)rival.update(dt,this.elapsed);
    if(this.result?.success){
      this.position=1+this.rivals.filter(r=>r.finishTime!==null&&r.finishTime<this.elapsed).length;
      this.result={...this.result,position:this.position,reward:racePayout(this.route,this.position)};
    }else{
      const progress=playerProgress(this.route,this.index,car);
      this.position=1+this.rivals.filter(r=>rivalProgress(r)>progress).length;
    }
  }
  drawRivals(ctx,night){for(const r of this.rivals)r.draw(ctx,night);}
}
export function recordRace(save,route,result){
  if(!result?.success||!Number.isFinite(result.elapsed)||result.elapsed<=0||
     !Number.isInteger(result.position)||result.position<1||result.position>4)return null;
  const records=save.raceRecords && typeof save.raceRecords==='object'?save.raceRecords:{};
  save.raceRecords=records;
  const old=records[route.id];
  const personalBest=!old||result.position<old.position||(result.position===old.position&&result.elapsed<old.elapsed);
  if(personalBest)records[route.id]={position:result.position,elapsed:result.elapsed};
  const reward=racePayout(route,result.position);
  save.cash=(Number.isFinite(save.cash)?Math.max(0,save.cash):0)+reward;
  return {personalBest,reward,position:result.position};
}
