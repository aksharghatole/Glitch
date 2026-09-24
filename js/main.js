// Entry point — Phase 3: cops + heat + pursuit + busted.

import { Save } from './save.js';
import { Input } from './input.js';
import { Camera } from './camera.js';
import { World } from './world.js';
import { Car } from './car.js';
import { UI } from './ui.js';
import { Glitch } from './glitch.js';
import { NitroFX } from './nitro.js';
import { Heat } from './heat.js';
import { CopsManager } from './cops.js';
import { resolveBuildingCollision, clampToWorld } from './physics.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let W = 0, H = 0, DPR = 1;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
}
window.addEventListener('resize', resize);
resize();

Save.load();

const game = {
  running: false,
  busted: false,
  world: null,
  car: null,
  cops: null,
  pinnedTimer: 0,
};

function initWorld() {
  const cityId = Save.data.currentCity || 'neon_district';
  game.world = new World(cityId);
  const start = game.world.city.start;
  game.car = new Car(start.x, start.y);
  game.cops = new CopsManager(game.world);
  Heat.reset();
  game.pinnedTimer = 0;
  Camera.x = start.x;
  Camera.y = start.y;
  Camera.zoom = 0.85;
  Camera.baseZoom = 0.85;
  Camera.targetZoom = 0.85;
}

function busted(reason) {
  if (game.busted) return;
  game.busted = true;
  game.running = false;
  Glitch.trigger(30);
  Camera.addShake(20);

  // NFS MW-ish penalty: lose 20% cash, reset heat
  const lost = Math.floor(Save.data.cash * 0.2);
  Save.data.cash = Math.max(0, Save.data.cash - lost);
  Save.data.heatRecord = Math.max(Save.data.heatRecord, Math.floor(Heat.stars));
  Save.save();

  const el = document.getElementById('busted-screen');
  if (el) {
    el.querySelector('.busted-reason').textContent = reason;
    el.querySelector('.busted-lost').textContent = `$${lost} LOST`;
    el.querySelector('.busted-heat').textContent = `HEAT RECORD ★${Save.data.heatRecord}`;
    el.classList.add('show');
  }
}

function respawn() {
  const el = document.getElementById('busted-screen');
  if (el) el.classList.remove('show');
  game.busted = false;
  initWorld();
  game.running = true;
}

UI.init({
  onStart: () => {
    if (game.busted) { respawn(); return; }
    game.running = true;
    UI.hideOverlay();
  },
  onOpenSettings: () => UI.showSettings(),
  onCloseSettings: () => UI.hideSettings(),
  onSetCtrlMode: (mode) => Input.setMode(mode),
});

document.getElementById('btn-busted-restart')?.addEventListener('click', respawn);

UI.setCtrlMode(Save.data.settings.ctrlMode || 'wasd');
Input.init(canvas);
initWorld();

let last = performance.now();

function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

  if (game.running && !game.busted) {
    game.car.update(dt, game.world);

    if (!game.car.airborne) resolveBuildingCollision(game.car, game.world);
    clampToWorld(game.car, game.world);

    game.world.update(dt);

    // Heat + cops
    game.cops.update(dt, game.car);
    Heat.update(dt, game.cops.activeCount);

    // Passive heat from high speed
    if (game.car.speedKmh > 200) Heat.addHeat(0.02 * dt);

    // Busted condition 1: health = 0
    if (game.car.health <= 0) {
      busted('CAR DESTROYED');
    }

    // Busted condition 2: pinned by cops while slow
    const copCount = game.cops.cops.length;
    const sp = Math.hypot(game.car.vx, game.car.vy);
    const surrounded = copCount >= 4 && sp < 60;
    if (surrounded) {
      game.pinnedTimer += dt;
      if (game.pinnedTimer > 2.5) busted('SURROUNDED');
    } else {
      game.pinnedTimer = 0;
    }

    Camera.follow(game.car, dt);
    Glitch.update();
    if (Math.random() < 0.002) Glitch.trigger(8);

    UI.updateHUD(game.car, Heat.wholeStars);
  }

  // ===== Draw =====
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#05010f';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  Camera.apply(ctx, W, H);

  if (game.world) game.world.draw(ctx);
  if (game.cops)  game.cops.draw(ctx);
  if (game.car)   game.car.draw(ctx);

  ctx.restore();

  // Day/night
  if (game.world) {
    const n = game.world.dayNight;
    const nightStrength = (1 - n) * 0.35;
    if (nightStrength > 0) {
      ctx.fillStyle = `rgba(20, 0, 60, ${nightStrength})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // Nitro FX
  if (game.car) NitroFX.draw(ctx, W, H, game.car);

  // Radar
  drawRadar(ctx, W, H);

  Glitch.draw(ctx, W, H);

  requestAnimationFrame(loop);
}

function drawRadar(ctx, W, H) {
  if (!game.car || !game.cops) return;
  const cx = W - 100;
  const cy = 100;
  const r  = 70;

  ctx.save();

  // Base circle
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
  ctx.fillStyle = 'rgba(0, 255, 255, 0.05)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Crosshair
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
  ctx.stroke();

  // Player dot
  ctx.fillStyle = '#0ff';
  ctx.shadowColor = '#0ff';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();

  // Cops
  game.cops.drawOnRadar(ctx, game.car, cx, cy, r);

  ctx.restore();
}

requestAnimationFrame(loop);