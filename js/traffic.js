// Bounded civilian traffic on the city's two-way grid lanes.
import { Heat } from './heat.js';
import { Glitch } from './glitch.js';
import { Camera } from './camera.js';
import { Impact } from './impact.js';
import { Audio } from './audio.js';
import { drawVehicle } from './vehicle-art.js';

const COLORS = ['#5475a6', '#b76f48', '#617e77', '#8b649f', '#b6bac6'];
const RADIUS = 19;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function buildLanes(world) {
  const lanes = [];
  const stride = world.blockSize + world.roadWidth;
  if (!(stride > 0 && world.roadWidth >= 4 * RADIUS)) return lanes;
  for (const axis of ['x', 'y']) {
    const cross = axis === 'x' ? world.h : world.w;
    const length = axis === 'x' ? world.w : world.h;
    for (let start = 0; start < cross; start += stride) {
      for (const direction of [1, -1]) {
        const line = start + world.roadWidth * (direction === 1 ? 0.72 : 0.28);
        if (line >= RADIUS && line <= cross - RADIUS && length > 2 * RADIUS) {
          lanes.push({ axis, line, direction, length });
        }
      }
    }
  }
  return lanes;
}

export class Civilian {
  constructor(lane, position, speed, color) {
    this.lane = lane;
    this.x = lane.axis === 'x' ? position : lane.line;
    this.y = lane.axis === 'y' ? position : lane.line;
    this.radius = RADIUS;
    this.cruise = speed;
    this.speed = speed;
    this.color = color;
    this.cooldown = 0;
    this.angle = lane.axis === 'x' ? (lane.direction === 1 ? 0 : Math.PI) :
      (lane.direction === 1 ? Math.PI / 2 : -Math.PI / 2);
  }
  get vx() { return this.lane.axis === 'x' ? this.speed * this.lane.direction : 0; }
  get vy() { return this.lane.axis === 'y' ? this.speed * this.lane.direction : 0; }

  draw(ctx, night = 0.5) {
    ctx.save();
    ctx.translate(this.x,this.y);
    ctx.rotate(this.angle);
    drawVehicle(ctx,{color:this.color,braking:this.speed<this.cruise*0.6,night});
    ctx.restore();
  }
}

// Keep civilians on their lanes and separate the player. Only closing impacts
// cause damage; a cooldown prevents one overlap from charging heat each frame.
export function collideTraffic(player, car) {
  if (player.airborne) return false;
  const dx = car.x - player.x, dy = car.y - player.y;
  const dist = Math.hypot(dx, dy);
  const limit = player.radius + car.radius;
  if (dist >= limit) return false;
  const rvx = player.vx - car.vx, rvy = player.vy - car.vy;
  const relative = Math.hypot(rvx, rvy);
  const nx = dist ? dx / dist : relative ? rvx / relative : 1;
  const ny = dist ? dy / dist : relative ? rvy / relative : 0;
  const closing = rvx * nx + rvy * ny;
  player.x -= nx * (limit - dist + 0.01);
  player.y -= ny * (limit - dist + 0.01);
  if (closing > 0) {
    player.vx -= nx * closing * 0.9;
    player.vy -= ny * closing * 0.9;
    if (closing > 75 && car.cooldown <= 0) {
      player.health = Math.max(0, player.health - Math.min(12, closing * 0.025));
      car.cooldown = 0.8;
      car.speed *= 0.25;
      Heat.addHeat(0.45);
      Audio.hit(closing);
      Impact.hit(player.x + nx * player.radius, player.y + ny * player.radius,
        nx, ny, closing, '#ffac72');
      Camera.addShake(Math.min(9, closing * 0.025));
      Glitch.trigger(Math.min(12, closing * 0.035));
    }
  }
  return true;
}

export class TrafficManager {
  constructor(world, random = Math.random, cap = 24) {
    this.world = world;
    this.random = random;
    this.cap = cap;
    this.lanes = buildLanes(world);
    this.cars = [];
    this.timer = 0;
  }

  spawn(player) {
    if (this.cars.length >= this.cap || !this.lanes.length) return false;
    for (let i = 0; i < 20; i++) {
      const lane = this.lanes[Math.floor(this.random() * this.lanes.length)];
      const center = player[lane.axis];
      const pos = center + (this.random() - 0.5) * 2000;
      if (pos < RADIUS || pos > lane.length - RADIUS) continue;
      const car = new Civilian(lane, pos, 85 + this.random() * 75,
        COLORS[Math.floor(this.random() * COLORS.length)]);
      const d = distance(player, car);
      if (d < 400 || d > 1100 || this.world.collidesCircle(car.x, car.y, car.radius)) continue;
      if (this.cars.some(other => distance(car, other) < 85)) continue;
      this.cars.push(car);
      return true;
    }
    return false;
  }

  update(dt, player) {
    this.cars = this.cars.filter(car => car[car.lane.axis] >= RADIUS &&
      car[car.lane.axis] <= car.lane.length - RADIUS && distance(car, player) <= 1600);
    this.timer += dt;
    if (this.timer >= 0.25) {
      this.timer = 0;
      this.spawn(player);
    }
    // Following vehicles brake behind slower traffic on the same lane.
    // Perpendicular traffic yields to a car already crossing its path.
    const snapshot = this.cars.map(car => ({ car, x: car.x, y: car.y, speed: car.speed }));
    for (const state of snapshot) {
      const car = state.car, lane = car.lane;
      car.cooldown = Math.max(0, car.cooldown - dt);
      let target = car.cooldown > 0 ? car.cruise * 0.25 : car.cruise;
      for (const other of snapshot) {
        if (other.car === car) continue;
        const ahead = (other[lane.axis] - state[lane.axis]) * lane.direction;
        if (other.car.lane === lane && ahead > 0 && ahead < 90) {
          target = Math.min(target, Math.max(0, (ahead - 45) * 2), other.speed);
        } else if (other.car.lane.axis !== lane.axis && ahead > 0 && ahead < 65) {
          const cross = lane.axis === 'x' ? 'y' : 'x';
          if (Math.abs(other[cross] - state[cross]) < 28) target = 0;
        }
      }
      car.speed += (target - car.speed) * Math.min(1, dt * 7);
      car.x += car.vx * dt;
      car.y += car.vy * dt;
      collideTraffic(player, car);
    }
  }

  draw(ctx, player, range = 1300, night = 0.5) {
    for (const car of this.cars) if (distance(car, player) <= range) car.draw(ctx, night);
  }
}
