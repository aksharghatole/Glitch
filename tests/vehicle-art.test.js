import test from 'node:test';
import assert from 'node:assert/strict';
import { drawVehicle, drawHelicopter, vehicleShape, policeShape } from '../js/vehicle-art.js';
import { Car } from '../js/car.js';
import { Cop } from '../js/cops.js';
import { Civilian } from '../js/traffic.js';
function canvas() {
  const calls=[]; let depth=0;
  const ctx=new Proxy({}, {get(obj,key){
    if(key==='save')return()=>depth++;
    if(key==='restore')return()=>{depth--;assert.ok(depth>=0);};
    if(key in obj)return obj[key];
    return (...args)=>{assert.ok(args.every(a=>typeof a!=='number'||Number.isFinite(a)));calls.push([key,...args]);};
  }});
  return {ctx,calls,check:()=>assert.equal(depth,0)};
}
test('police classes have distinguishable silhouettes',()=>{
  assert.notEqual(policeShape('patrol'),policeShape('interceptor'));
  assert.ok(vehicleShape('suv').width>vehicleShape('sedan').width);
  assert.ok(vehicleShape('roadblock').length>vehicleShape('interceptor').length);
  assert.deepEqual(vehicleShape('unknown'),vehicleShape('sedan'));
});
test('all vehicle styles render with finite geometry and balanced canvas state',()=>{
  for(const kind of ['sport','sedan','interceptor','suv','roadblock']){
    const c=canvas();drawVehicle(c.ctx,{kind,player:true,boost:true,police:true,siren:true,health:0.3,night:1});
    c.check();assert.ok(c.calls.length>30);
  }
});
test('night headlights add geometry and boost adds exhaust',()=>{
  const day=canvas(),night=canvas(),boost=canvas();
  drawVehicle(day.ctx,{player:true,night:0});
  drawVehicle(night.ctx,{player:true,night:1});
  drawVehicle(boost.ctx,{player:true,night:1,boost:true});
  assert.ok(night.calls.length>day.calls.length);
  assert.ok(boost.calls.length>night.calls.length);
});
test('helicopter render balances transforms including reduced motion',()=>{
  for(const reduced of [true,false]){const c=canvas();drawHelicopter(c.ctx,{angle:1,phase:2,reduced});c.check();assert.ok(c.calls.length>10);}
});
test('player, civilian and police render without modifying collision geometry',()=>{
  const cars=[new Car(0,0),new Civilian({axis:'x',line:0,direction:1,length:1000},10,100,'#fff'),
    ...['patrol','interceptor','suv','roadblock','helicopter','undercover','federal'].map(id=>new Cop(id,0,0))];
  for(const vehicle of cars){const c=canvas();const snapshot=[vehicle.x,vehicle.y,vehicle.radius,vehicle.health];vehicle.draw(c.ctx,0.8);c.check();assert.deepEqual([vehicle.x,vehicle.y,vehicle.radius,vehicle.health],snapshot);}
});
