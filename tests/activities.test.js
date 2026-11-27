import test from 'node:test';
import assert from 'node:assert/strict';
import { TRIALS, TimeTrial, recordTrial, CHECKPOINT_RADIUS } from '../js/activities.js';
import { World } from '../js/world.js';
test('routes stay on clear roads including connections',()=>{
  for(const route of TRIALS){
    const w=new World(route.city);
    for(let i=0;i<route.points.length;i++){
      const p=route.points[i];assert.ok(p.x>CHECKPOINT_RADIUS&&p.y>CHECKPOINT_RADIUS&&p.x<w.w-CHECKPOINT_RADIUS&&p.y<w.h-CHECKPOINT_RADIUS);
      assert.equal(w.collidesCircle(p.x,p.y,CHECKPOINT_RADIUS),null);
      if(i){const a=route.points[i-1];assert.ok(a.x===p.x||a.y===p.y);
        for(let t=0;t<=1;t+=0.02)assert.equal(w.collidesCircle(a.x+(p.x-a.x)*t,a.y+(p.y-a.y)*t,22),null);}
    }
  }
});
test('countdown prevents progress until start',()=>{
  const t=new TimeTrial(TRIALS[0]);t.update(2,t.route.points[1]);assert.equal(t.state,'countdown');assert.equal(t.index,1);
  t.update(1,t.route.points[1]);assert.equal(t.state,'running');assert.equal(t.elapsed,0);
});
test('checkpoints require order and finish only after entire route',()=>{
  const t=new TimeTrial(TRIALS[0]);t.update(3,{});t.update(0.1,t.route.points[2]);assert.equal(t.index,1);
  for(const p of t.route.points.slice(1))t.update(1,p);
  assert.equal(t.state,'complete');assert.equal(t.result.reward,500);const elapsed=t.elapsed;t.update(100,{});assert.equal(t.elapsed,elapsed);
});
test('timeout and arrest fail without payout',()=>{
  const a=new TimeTrial(TRIALS[0]);a.update(3,{});a.update(40,a.route.points[1]);assert.equal(a.state,'failed');
  const b=new TimeTrial(TRIALS[0]);b.fail('BUSTED');assert.equal(b.state,'failed');
  const save={cash:0};assert.equal(recordTrial(save,b.route,b.result),null);assert.equal(save.cash,0);
});
test('successful runs pay cash and retain fastest record',()=>{
  const s={cash:100},r=TRIALS[0];
  assert.equal(recordTrial(s,r,{success:true,elapsed:30}).personalBest,true);
  assert.equal(recordTrial(s,r,{success:true,elapsed:32}).personalBest,false);
  assert.equal(recordTrial(s,r,{success:true,elapsed:24}).personalBest,true);
  assert.equal(s.cash,1600);assert.equal(s.trialRecords[r.id],24);
});
test('retry starts with a clean countdown and progress',()=>{
  const a=new TimeTrial(TRIALS[0]);a.update(3,{});a.update(1,a.route.points[1]);a.fail('ABANDONED');
  const b=new TimeTrial(a.route);assert.equal(b.index,1);assert.equal(b.countdown,3);assert.equal(b.result,null);
});
