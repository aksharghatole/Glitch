// Damage + collision between player and cops — punchy ram feel.

import { Glitch } from './glitch.js';
import { Camera } from './camera.js';
import { Heat } from './heat.js';

export function handleCarCollision(player, cop, dt) {
  const dx = cop.x - player.x;
  const dy = cop.y - player.y;
  const dist = Math.hypot(dx, dy) || 0.001;
  const minDist = player.radius + cop.radius;
  if (dist >= minDist) return false;

  // Normal (from player toward cop)
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;

  // Relative velocity along normal
  const rvx = cop.vx - player.vx;
  const rvy = cop.vy - player.vy;
  const relVelAlongNormal = rvx * nx + rvy * ny;

  // Player momentum = speed toward the cop
  const playerSpeed = Math.hypot(player.vx, player.vy);
  const playerMomentum = Math.max(0, (player.vx * nx + player.vy * ny));

  // ===== Weighted separation =====
  // Player is HEAVY: only 15% of overlap pushed onto player.
  // Cop takes 85%. Stops the "magnet stick" feel.
  const playerShare = 0.15;
  const copShare    = 0.85;

  player.x -= nx * overlap * playerShare;
  player.y -= ny * overlap * playerShare;
  cop.x    += nx * overlap * copShare;
  cop.y    += ny * overlap * copShare;

  // ===== Impulse =====
  // If player is moving INTO the cop → heavy shove on cop, tiny slowdown on player.
  if (relVelAlongNormal < 0) {
    const restitution = 1.6; // >1 = cop gets flung
    const j = -relVelAlongNormal * restitution;

    // Cop gets 90% of the impulse → shoved away
    cop.vx += nx * j * 0.9;
    cop.vy += ny * j * 0.9;

    // Player only loses 10% → keeps momentum
    player.vx -= nx * j * 0.1;
    player.vy -= ny * j * 0.1;

    // ===== Damage based on PLAYER SPEED (not relative) =====
    // Ram hard → big damage to cop, small damage to you.
    const impact = playerMomentum * 0.06;

    if (impact > 0.4) {
      const copDamage    = impact * 1.6;      // cops take a lot
      const playerDamage = impact * 0.35;      // you take a little

      cop.health    = Math.max(0, cop.health    - copDamage);
      player.health = Math.max(0, player.health - playerDamage);

      // Heat spike only on solid hits
      if (impact > 1.0) {
        Heat.addHeat(0.35);
        Glitch.trigger(Math.min(20, impact * 4));
        Camera.addShake(Math.min(14, impact * 2));
      }
    }
  }

  // Slight lateral friction so cops don't slide forever
  cop.vx *= 0.96;
  cop.vy *= 0.96;

  return true;
}