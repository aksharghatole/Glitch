import test from 'node:test';
import assert from 'node:assert/strict';
import { Cop, CopsManager } from '../js/cops.js';
import { Heat } from '../js/heat.js';

const world = (blocked = false) => ({ w: 5000, h: 5000, collidesCircle: () => blocked ? {} : null });
const player = (overrides = {}) => ({ x: 2500, y: 2500, vx: 0, vy: 0, speedKmh: 0, radius: 22, health: 100, ...overrides });
const unit = (type, x, y) => {
  const c = new Cop(type, x, y);
  c.update = () => {};
  return c;
};

test('distant and airborne units cannot count toward a ground arrest', () => {
  Heat.reset();
  const m = new CopsManager(world());
  m.cops = [unit('patrol', 2600, 2500), unit('helicopter', 2500, 2500), unit('patrol', 3200, 2500)];
  m.update(0, player());
  assert.equal(m.nearbyGroundCount, 1);
  assert.equal(m.activeCount, 2);
});

test('outdated roadblocks and far police despawn', () => {
  Heat.reset();
  const m = new CopsManager(world());
  m.cops = [unit('roadblock', 3700, 2500), unit('patrol', 4300, 2500)];
  m.update(0, player());
  assert.equal(m.cops.length, 0);
  assert.equal(m.activeCount, 0);
});

test('slowing after losing contact permits heat decay without new spawns', () => {
  Heat.reset();
  Heat.addHeat(2);
  const m = new CopsManager(world(), () => 0);
  const p = player();
  for (let i = 0; i < 100; i++) {
    m.update(0.1, p);
    Heat.update(0.1, m.activeCount, p);
  }
  assert.equal(m.cops.length, 0);
  assert.equal(Heat.stars, 0);
});

test('speeding with heat spawns a unit at safe distance', () => {
  Heat.reset();
  Heat.addHeat(1);
  const m = new CopsManager(world(), () => 0);
  m.update(1.3, player({ speedKmh: 100 }));
  assert.equal(m.cops.length, 1);
  assert.equal(m.cops[0].x, 3200);
});

test('spawn attempts are bounded and reject buildings and map edges', () => {
  const m = new CopsManager(world(true), () => 0);
  assert.equal(m.spawnCop(player(), 1), false);
  const edge = new CopsManager(world(), () => 0);
  assert.equal(edge.spawnCop(player({x: 4900}), 1), false);
});

test('roadblocks honor remaining capacity and reject stationary drivers', () => {
  const m = new CopsManager(world());
  assert.equal(m.spawnRoadblock(player()), 0);
  assert.equal(m.spawnRoadblock(player({vx: 200}), 1), 1);
  assert.equal(m.cops.length, 1);
  assert.equal(m.cops[0].x, 3000);
  assert.equal(m.spawnRoadblock(player({vx: 200}), 3), 2);
  assert.equal(m.cops.length, 3);
});

test('manager enforces total unit cap including roadblocks', () => {
  Heat.reset();
  Heat.addHeat(4);
  const m = new CopsManager(world());
  m.cops = Array.from({length: 7}, (_, i) => unit('patrol', 2600 + i * 50, 2600));
  m.spawnTimer = 2;
  m.roadblockTimer = 9;
  m.update(0, player({vx: 200, speedKmh: 100}));
  assert.equal(m.cops.length, 8);
});

test('reset clears pursuit counters', () => {
  const m = new CopsManager(world());
  m.activeCount = 5;
  m.nearbyGroundCount = 4;
  m.reset();
  assert.equal(m.activeCount, 0);
  assert.equal(m.nearbyGroundCount, 0);
});
