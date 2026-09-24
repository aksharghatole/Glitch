// Damage + collision between player and cops.

import { Glitch } from './glitch.js';
import { Camera } from './camera.js';
import { Heat } from './heat.js';

export function handleCarCollision(player, cop, dt) {
  const dx = cop.x - player.x;
  const dy = cop.y - player.y;
  const dist = Math.hypot(dx, dy);
  const minDist = player.radius + cop.radius;
  if (dist >= minDist) return false;

  // Separate
  const nx = dx / (dist || 1);
  const ny = dy / (dist || 1);
  const overlap = minDist - dist;

  const pWeight = 1;
  const cWeight = cop.weight || 1;
  const totalW = pWeight + cWeight;

  player.x -= nx * overlap * (cWeight / totalW);
  player.y -= ny * overlap * (cWeight / totalW);
  cop.x    += nx * overlap * (pWeight / totalW);
  cop.y    += ny * overlap * (pWeight / totalW);

  // Relative velocity → damage
  const rvx = cop.vx - player.vx;
  const rvy = cop.vy - player.vy;
  const rel = Math.hypot(rvx, rvy);
  const closing = -(rvx * -nx + rvy * -ny); // negative = approaching

  if (closing > 0) {
    const impact = closing * 0.05;
    const playerDamage = impact * (cWeight / totalW) * 1.2;
    const copDamage    = impact * (pWeight / totalW) * 0.8;

    player.health = Math.max(0, player.health - playerDamage);
    cop.health    = Math.max(0, cop.health    - copDamage);

    if (impact > 1.5) {
      Glitch.trigger(Math.min(20, impact * 3));
      Camera.addShake(Math.min(16, impact * 2));
      // Player takes heat for ramming a cop
      Heat.addHeat(0.3);
    }
  }

  // Bounce
  const bounce = 0.6;
  player.vx -= nx * (closing) * bounce * (cWeight / totalW);
  player.vy -= ny * (closing) * bounce * (cWeight / totalW);

  return true;
}