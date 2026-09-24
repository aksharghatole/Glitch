// Simple collision: circle vs building AABB, and world bounds.

export function resolveBuildingCollision(car, world) {
  const hit = world.collidesCircle(car.x, car.y, car.radius);
  if (!hit) return;

  // Push car out along shortest axis
  const cx = car.x;
  const cy = car.y;
  const nearestX = Math.max(hit.x, Math.min(cx, hit.x + hit.w));
  const nearestY = Math.max(hit.y, Math.min(cy, hit.y + hit.h));

  let dx = cx - nearestX;
  let dy = cy - nearestY;
  const dist = Math.hypot(dx, dy) || 0.0001;

  const push = (car.radius - dist);
  car.x += (dx / dist) * push;
  car.y += (dy / dist) * push;

  // Kill velocity component into the wall
  const nx = dx / dist;
  const ny = dy / dist;
  const dot = car.vx * nx + car.vy * ny;
  if (dot < 0) {
    car.vx -= dot * nx * 1.4;
    car.vy -= dot * ny * 1.4;
    car.vx *= 0.6;
    car.vy *= 0.6;
  }
}

export function clampToWorld(car, world) {
  const r = car.radius;
  if (car.x < r) { car.x = r; car.vx = 0; }
  if (car.y < r) { car.y = r; car.vy = 0; }
  if (car.x > world.w - r) { car.x = world.w - r; car.vx = 0; }
  if (car.y > world.h - r) { car.y = world.h - r; car.vy = 0; }
}