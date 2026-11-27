import test from 'node:test';
import assert from 'node:assert/strict';
import { handleCarCollision } from '../js/damage.js';
import { Heat } from '../js/heat.js';

const car = (x = 0, vx = 0, cfg = {}) =>
  ({ x, y: 0, vx, vy: 0, radius: 20, health: 100, cfg });
const collide = (a, b) => handleCarCollision(a, b, 1 / 60);

test('non-overlapping cars are unchanged', () => {
  const a = car(), b = car(50);
  assert.equal(collide(a, b), false);
  assert.equal(a.x, 0);
  assert.equal(b.x, 50);
});

test('coincident stationary cars separate without NaN', () => {
  const a = car(), b = car();
  assert.equal(collide(a, b), true);
  assert.ok(Math.abs(Math.hypot(a.x - b.x, a.y - b.y) - 40) < 1e-8);
  for (const n of [a.x, a.y, a.vx, a.vy, b.x, b.y, b.vx, b.vy]) assert.ok(Number.isFinite(n));
  assert.equal(a.health, 100);
});

test('a forward ram keeps player momentum and damages police', () => {
  Heat.reset();
  const a = car(0, 250), b = car(30);
  assert.equal(collide(a, b), true);
  assert.ok(a.vx > 200 && b.vx > 0);
  assert.ok(b.health < a.health && a.health < 100);
  assert.ok(Heat.stars > 0);
});

test('separating cars do not take impact damage', () => {
  const a = car(0, -200), b = car(30);
  collide(a, b);
  assert.equal(a.health, 100);
  assert.equal(b.health, 100);
});

test('roadblocks remain anchored and stop a forward ram', () => {
  const a = car(0, 250), b = car(30, 0, { static: true });
  collide(a, b);
  assert.equal(b.x, 30);
  assert.equal(b.vx, 0);
  assert.equal(a.x, -10);
  assert.ok(a.vx <= 0);
});

test('helicopters cannot collide with ground cars', () => {
  Heat.reset();
  const a = car(0, 250), b = car(0, 0, { flying: true });
  const before = structuredClone([a, b]);
  assert.equal(collide(a, b), false);
  assert.deepEqual([a, b], before);
  assert.equal(Heat.stars, 0);
});
