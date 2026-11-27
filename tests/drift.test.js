import test from 'node:test';
import assert from 'node:assert/strict';
import { Car } from '../js/car.js';
import { Input } from '../js/input.js';
import { DriftTrails } from '../js/drift-trails.js';
const dt = 1/60;
function moving() { const c = new Car(0,0); c.vx = 300; return c; }
function keys(value) { Input.clear(); Input.mode = 'wasd'; Input.keys = value; }
test('space and turning at speed produces controlled drift', () => {
  keys({s:true,' ':true}); const c = moving(); c.update(dt);
  assert.equal(c.drifting,true);
  assert.ok(c.vx > 280 && c.vy > 0);
  assert.ok(c.angle > 0);
});
test('ordinary steering is more responsive than drift', () => {
  keys({s:true}); const normal = moving(); normal.update(dt);
  keys({s:true,' ':true}); const drift = moving(); drift.update(dt);
  assert.ok(normal.vy > drift.vy);
  assert.equal(normal.drifting,false);
});
test('drift requires speed, turning and grounded vehicle; boost takes priority', () => {
  keys({d:true,' ':true}); const straight = moving(); straight.update(dt); assert.equal(straight.drifting,false);
  keys({s:true,' ':true}); const slow = new Car(0,0); slow.update(dt); assert.equal(slow.drifting,false);
  const air = moving(); air.airborne=true; air.z=100; air.update(dt); assert.equal(air.drifting,false);
  keys({s:true,' ':true,shift:true}); const boosted=moving(); boosted.update(dt);
  assert.equal(boosted.drifting,false); assert.equal(boosted.nitroActive,true); assert.ok(boosted.nitro<100);
});
test('touch drift flag works and clear releases all held actions', () => {
  keys({s:true}); Input.driftHeld=true; const c=moving(); c.update(dt); assert.equal(c.drifting,true);
  Input.nitroHeld=true; Input.joystickActive=true; Input.clear();
  assert.equal(Input.driftHeld,false); assert.equal(Input.nitroHeld,false); assert.equal(Input.joystickActive,false);
  c.update(dt); assert.equal(c.drifting,false);
});
test('trails are bounded, expire, and reset on reduced motion', () => {
  const fx=new DriftTrails(); const c=moving(); c.drifting=true;
  for(let j=0;j<500;j++){ c.x+=8; fx.update(0.016,c); }
  assert.ok(fx.marks.length>0 && fx.marks.length<=240);
  assert.ok(fx.smoke.length>0 && fx.smoke.length<=64);
  fx.update(4); assert.equal(fx.marks.length,0); assert.equal(fx.smoke.length,0);
  fx.setReducedMotion(true); fx.update(0.1,c); assert.equal(fx.smoke.length,0);
});
test('no trail bridges jumps or non-drifting gaps', () => {
  const fx=new DriftTrails(); const c=moving(); c.drifting=true;
  fx.update(dt,c); c.x+=10; fx.update(dt,c); assert.equal(fx.marks.length,2);
  c.airborne=true; fx.update(dt,c); c.airborne=false; c.x+=500; fx.update(dt,c);
  assert.equal(fx.marks.length,2);
});
