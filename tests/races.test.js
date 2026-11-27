import test from 'node:test';
import assert from 'node:assert/strict';
import { RACES, ACTIVITIES, Rival, StreetRace, playerProgress, racePayout, recordRace } from '../js/races.js';
import { World } from '../js/world.js';
const route=RACES[0];
test('six race options preserve two existing trials and unique ids',()=>{
  assert.equal(RACES.length,6);assert.equal(ACTIVITIES.length,8);
  assert.equal(new Set(ACTIVITIES.map(a=>a.id)).size,8);
});
test('rivals wait for countdown and follow the course without crossing buildings',()=>{
  const race=new StreetRace(route);const w=new World(route.city);
  race.update(2,route.points[0]);assert.equal(race.rivals[0].x,route.points[0].x);
  race.update(1,route.points[0]);
  for(let i=0;i<900;i++){
    race.update(1/30,route.points[0]);
    for(const r of race.rivals)assert.equal(w.collidesCircle(r.x,r.y,18),null);
  }
  assert.ok(race.rivals[0].index>1);assert.equal(race.position,4);
});
test('higher difficulty rivals finish sooner and retain finish time',()=>{
  const a=new Rival(route,170,0),b=new Rival(route,335,0);
  for(let i=1;i<=1500;i++){a.update(1/30,i/30);b.update(1/30,i/30);}
  assert.ok(a.finishTime>b.finishTime);assert.ok(b.finishTime>0);
  const time=b.finishTime;b.update(1,51);assert.equal(b.finishTime,time);
});
test('race position respects checkpoint order and actual finish times',()=>{
  const r=new StreetRace(route);r.update(3,route.points[0]);
  for(const p of route.points.slice(1))r.update(1,p);
  assert.equal(r.result.position,1);assert.equal(r.result.reward,route.reward);
  assert.ok(playerProgress(route,2,route.points[1])>playerProgress(route,1,route.points[1]));
});
test('finishing behind opponents gives lower payout and independent records',()=>{
  const r=new StreetRace(route);r.update(3,route.points[0]);
  for(let i=0;i<30;i++)r.update(1,route.points[0]);
  for(const p of route.points.slice(1))r.update(1,p);
  assert.equal(r.result.position,4);
  const save={cash:0,trialRecords:{'neon-loop':20}};
  assert.equal(recordRace(save,route,r.result).reward,racePayout(route,4));
  assert.equal(save.trialRecords['neon-loop'],20);
  assert.equal(save.raceRecords[route.id].position,4);
  assert.equal(recordRace(save,route,{success:true,elapsed:35,position:1}).personalBest,true);
});
test('failed races cannot pay or advance rivals after termination',()=>{
  const r=new StreetRace(route);r.fail('BUSTED');r.update(5,route.points[1]);
  assert.equal(r.rivals[0].index,1);
  const save={cash:50};assert.equal(recordRace(save,route,r.result),null);assert.equal(save.cash,50);
});
