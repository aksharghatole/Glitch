// Damage + collision between player and cops — punchy ram feel.

import { Glitch } from './glitch.js';
import { Camera } from './camera.js';
import { Heat } from './heat.js';
import { Impact } from './impact.js';

export function handleCarCollision(player, cop, dt) {
  // Air support tracks the player but is not a physical ground obstacle.
  if (cop.cfg?.flying) return false;
  const dx = cop.x - player.x;
  const dy = cop.y - player.y;
  const dist = Math.hypot(dx, dy);
  const minDist = player.radius + cop.radius;
  if (dist >= minDist) return false;

  // Normal (from player toward cop)
  // At identical centers, use the approach direction or a stable fallback.
  const approachX = player.vx - cop.vx;
  const approachY = player.vy - cop.vy;
  const approach = Math.hypot(approachX, approachY);
  const nx = dist > 0 ? dx / dist : approach > 0 ? approachX / approach : 1;
  const ny = dist > 0 ? dy / dist : approach > 0 ? approachY / approach : 0;
  const overlap = minDist - dist;

  // Relative velocity along normal
  const rvx = cop.vx - player.vx;
  const rvy = cop.vy - player.vy;
  const relVelAlongNormal = rvx * nx + rvy * ny;

  // Player momentum = speed toward the cop
  const playerMomentum = Math.max(0, (player.vx * nx + player.vy * ny));

  // ===== Weighted separation =====
  // Player is HEAVY: only 15% of overlap pushed onto player.
  // Cop takes 85%. Stops the "magnet stick" feel.
  const anchored = Boolean(cop.cfg?.static);
  const playerShare = anchored ? 1 : 0.15;
  const copShare = 1 - playerShare;

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
    if (!anchored) {
      cop.vx += nx * j * 0.9;
      cop.vy += ny * j * 0.9;
    }

    // Player only loses 10% → keeps momentum
    const playerImpulse = anchored ? 0.8 : 0.1;
    player.vx -= nx * j * playerImpulse;
    player.vy -= ny * j * playerImpulse;

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
        Impact.hit(player.x + nx * player.radius, player.y + ny * player.radius,
          nx, ny, playerMomentum, '#ffd068');
        Glitch.trigger(Math.min(20, impact * 4));
        Camera.addShake(Math.min(14, impact * 2));
      }
    }
  }

  // Slight lateral friction so cops don't slide forever
  if (!anchored) {
    const friction = Math.pow(0.96, Math.max(0, dt ?? 1 / 60) * 60);
    cop.vx *= friction;
    cop.vy *= friction;
  }

  return true;
}
