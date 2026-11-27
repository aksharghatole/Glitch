import test from 'node:test';
import assert from 'node:assert/strict';
import { audioMix, GameAudio } from '../js/audio.js';
const car = (extra={}) => ({x:0,y:0,vx:0,vy:0,...extra});
const param = () => ({value:0,setTargetAtTime(v){this.value=v;},setValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;}});
function mockContext(){
  const nodes=[];
  const node=()=>{const n={gain:param(),frequency:param(),Q:param(),connect(){},disconnect(){},start(){},stop(){this.onended?.();}};nodes.push(n);return n;};
  return {nodes,state:'suspended',currentTime:1,sampleRate:100,destination:{},
    createGain:node,createOscillator:node,createBufferSource:node,createBiquadFilter:node,
    createBuffer:(_,n)=>({getChannelData:()=>new Float32Array(n)}),
    async resume(){this.state='running';}};
}
test('engine mix responds to speed, throttle and gear',()=>{
  const idle=audioMix(car()),moving=audioMix(car({vx:70}),[],1);
  assert.ok(moving.engineHz>idle.engineHz);
  assert.ok(moving.engineGain>idle.engineGain);
  assert.equal(audioMix(car({vx:210})).gear,2);
});
test('nearby police sirens louder; undercover units hidden until revealed',()=>{
  const p=car();
  assert.equal(audioMix(p,[{x:900,y:0}]).sirenGain,0);
  assert.ok(audioMix(p,[{x:50,y:0}]).sirenGain>audioMix(p,[{x:500,y:0}]).sirenGain);
  assert.equal(audioMix(p,[{x:50,y:0,cfg:{stealth:true}}]).sirenGain,0);
});
test('boost and drift mix are conditional',()=>{
  assert.ok(audioMix(car({nitroActive:true,drifting:true})).boostGain>0);
  assert.ok(audioMix(car({drifting:true})).driftGain>0);
  assert.equal(audioMix(car({drifting:true,airborne:true})).driftGain,0);
});
test('audio is lazy, resumes and reuses its graph',async()=>{
  let calls=0;const ctx=mockContext();const a=new GameAudio(()=>{calls++;return ctx;});
  a.update(null,[],0,false,0);assert.equal(calls,0);
  assert.equal(await a.unlock(),true);assert.equal(await a.unlock(),true);assert.equal(calls,1);
  a.update(car({vx:100}),[],1,true,0);assert.ok(a.engine.gain.gain.value>0);
  a.update(null,[],0,false,0);assert.equal(a.engine.gain.gain.value,0);
});
test('mute and volume are bounded; collisions rate limited',async()=>{
  const ctx=mockContext(),a=new GameAudio(()=>ctx);await a.unlock();
  a.setVolume(4);assert.equal(a.master.gain.value,1);
  a.setMuted(true);assert.equal(a.master.gain.value,0);
  a.setMuted(false);a.update(car(),[],0,true,0);
  const before=ctx.nodes.length;a.hit(300);assert.ok(ctx.nodes.length>before);
  const after=ctx.nodes.length;a.hit(300);assert.equal(ctx.nodes.length,after);
  ctx.currentTime+=0.2;a.hit(300);assert.ok(ctx.nodes.length>after);
});
test('unsupported audio context fails silently',async()=>{
  const a=new GameAudio(()=>null);assert.equal(await a.unlock(),false);
  a.hit(300);a.update(null,[],0,false,0);
});
