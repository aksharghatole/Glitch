import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../js/world.js';
import { Heat } from '../js/heat.js';
import { buildLanes, Civilian, TrafficManager, collideTraffic } from '../js/traffic.js';

const player = (extra = {}) => ({ x: 600, y: 600, vx: 0, vy: 0, radius: 22, health: 100, ...extra });
const lane = { axis: 'x', line: 600, direction: 1, length: 4000 };
const car = (position = 630, speed = 100) => new Civilian(lane, position, speed, '#fff');

test('city lanes are clear of buildings and contained in map', () => {
  const world = new World('neon_district');
  const lanes = buildLanes(world);
  assert.ok(lanes.length > 10);
  for (const l of lanes) {
    for (let pos = 20; pos < l.length - 20; pos += 50) {
      const c = new Civilian(l, pos, 100, '#fff');
      assert.equal(world.collidesCircle(c.x, c.y, c.radius), null);
    }
  }
});

test('traffic advances along its lane and does not drift sideways', () => {
  const m = new TrafficManager(new World('neon_district'));
  const c = car(900);
  m.cars = [c];
  m.update(0.1, player());
  assert.equal(c.x, 910);
  assert.equal(c.y, 600);
});

test('spawning is capped and outside the player safety radius', () => {
  const m = new TrafficManager(new World('neon_district'), () => 0.8, 1);
  // Explicit legal horizontal lane for a repeatable spawn.
  m.lanes = [{ axis: 'x', line: 606.4, direction: 1, length: 4000 }];
  assert.equal(m.spawn(player()), true);
  assert.ok(Math.hypot(m.cars[0].x - 600, m.cars[0].y - 600) >= 400);
  assert.equal(m.spawn(player()), false);
});

test('following car brakes behind a slower vehicle', () => {
  const m = new TrafficManager(new World('neon_district'));
  const rear = car(900, 150), front = car(950, 85);
  m.cars = [rear, front];
  m.update(0.1, player());
  assert.ok(rear.speed < 85);
});

test('strong civilian collision causes damage and heat once per cooldown', () => {
  Heat.reset();
  const p = player({vx: 300}), c = car();
  assert.equal(collideTraffic(p, c), true);
  assert.ok(p.health < 100);
  assert.ok(p.vx < 300);
  const health = p.health, heat = Heat.stars;
  p.x = 600; p.vx = 300;
  collideTraffic(p, c);
  assert.equal(p.health, health);
  assert.equal(Heat.stars, heat);
});

test('airborne cars clear civilian vehicles', () => {
  const p = player({airborne: true, vx: 300});
  assert.equal(collideTraffic(p, car()), false);
  assert.equal(p.health, 100);
  assert.equal(p.x, 600);
});

test('coincident stationary vehicles separate with finite positions', () => {
  const p = player(), c = car(600, 0);
  assert.equal(collideTraffic(p, c), true);
  assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
  assert.ok(Math.hypot(p.x - c.x, p.y - c.y) >= p.radius + c.radius);
  assert.equal(p.health, 100);
});

test('vehicles outside the map or far from the player are removed', () => {
  const m = new TrafficManager(new World('neon_district'));
  m.cars = [car(-10), car(3500), car(900)];
  m.update(0.1, player());
  assert.equal(m.cars.length, 1);
});
