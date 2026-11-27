import test from 'node:test';
import assert from 'node:assert/strict';
import { Impact, ImpactEffects } from '../js/impact.js';
import { Glitch } from '../js/glitch.js';
import { Camera } from '../js/camera.js';
import { handleCarCollision } from '../js/damage.js';
import { Civilian, collideTraffic } from '../js/traffic.js';

test('small scrapes do not emit heavy collision effects', () => {
  const fx = new ImpactEffects(() => 0.5);
  fx.hit(0, 0, 1, 0, 20);
  assert.equal(fx.particles.length, 0);
  fx.hit(0, 0, 1, 0, 100);
  assert.ok(fx.particles.length > 0);
  assert.equal(fx.rings.length, 0);
});

test('heavy impacts emit local particles and rings within fixed caps', () => {
  const fx = new ImpactEffects(() => 0.5);
  for (let i = 0; i < 40; i++) fx.hit(100, 200, 1, 0, 500);
  assert.equal(fx.particles.length, 160);
  assert.equal(fx.rings.length, 8);
  assert.ok(fx.particles.every(p => p.x === 100 && p.y === 200));
  fx.update(1);
  assert.equal(fx.particles.length, 0);
  assert.equal(fx.rings.length, 0);
});

test('particle position is consistent across time steps', () => {
  const a = new ImpactEffects(() => 0.5), b = new ImpactEffects(() => 0.5);
  a.hit(0, 0, 1, 0, 200); b.hit(0, 0, 1, 0, 200);
  a.update(0.1);
  for (let i = 0; i < 6; i++) b.update(0.1 / 6);
  assert.ok(Math.abs(a.particles[0].x - b.particles[0].x) < 1e-8);
});

test('reduced motion clears and suppresses impact, glitch and shake', () => {
  const fx = new ImpactEffects(() => 0.5);
  fx.hit(0, 0, 1, 0, 400);
  fx.setReducedMotion(true);
  fx.hit(0, 0, 1, 0, 400);
  assert.equal(fx.particles.length, 0);
  assert.equal(fx.rings.length, 0);
  Glitch.setReducedMotion(true); Camera.setReducedMotion(true);
  Glitch.trigger(20); Camera.addShake(20);
  assert.equal(Glitch.pulse, 0);
  assert.equal(Camera.shake, 0);
  Glitch.setReducedMotion(false); Camera.setReducedMotion(false);
});

test('glitch and shake decay even without advancing the game', () => {
  Glitch.trigger(20); Camera.addShake(20);
  Glitch.update(1); Camera.updateEffects(1);
  assert.equal(Glitch.pulse, 0);
  assert.equal(Camera.shake, 0);
});

test('police and civilian collisions emit impact effects', () => {
  const player = () => ({x:0,y:0,vx:300,vy:0,radius:22,health:100});
  Impact.reset();
  handleCarCollision(player(), {x:30,y:0,vx:0,vy:0,radius:20,health:100}, 1/60);
  assert.ok(Impact.particles.length > 0);
  Impact.reset();
  collideTraffic(player(), new Civilian({axis:'x',line:0,direction:1,length:4000}, 30, 100, '#fff'));
  assert.ok(Impact.particles.length > 0);
  Impact.reset();
});
