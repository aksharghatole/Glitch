// Entry point. Boots the game, runs the loop.

import { Save } from './save.js';
import { Input } from './input.js';
import { Camera } from './camera.js';
import { World } from './world.js';
import { Car } from './car.js';
import { UI } from './ui.js';
import { Glitch } from './glitch.js';
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

// ===== State =====
Save.load();

const game = {
  running: false,
  world: null,
  car: null,
};

function initWorld() {
  const cityId = Save.data.currentCity || 'neon_district';
  game.world = new World(cityId);
  const start = game.world.city.start;
  game.car = new Car(start.x, start.y);
  Camera.x = start.x;
  Camera.y = start.y;
  Camera.zoom = 0.85;
  Camera.targetZoom = 0.85;
}

// ===== UI wiring =====
UI.init({
  onStart: () => {
    game.running = true;
    UI.hideOverlay();
  },
  onOpenSettings: () => UI.showSettings(),
  onCloseSettings: () => UI.hideSettings(),
  onSetCtrlMode: (mode) => Input.setMode(mode),
});

UI.setCtrlMode(Save.data.settings.ctrlMode || 'wasd');

// ===== Input boot =====
Input.init(canvas);

// ===== Boot world =====
initWorld();

// ===== Loop =====
let last = performance.now();

function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

  if (game.running) {
    game.car.update(dt);

    resolveBuildingCollision(game.car, game.world);
    clampToWorld(game.car, game.world);

    Camera.follow(game.car, dt);
    Glitch.update();

    // Random ambient glitch
    if (Math.random() < 0.002) Glitch.trigger(8);

    UI.updateHUD(game.car);
  }

  // === Draw ===
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#05010f';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  Camera.apply(ctx, W, H);

  if (game.world) game.world.draw(ctx);
  if (game.car)   game.car.draw(ctx);

  ctx.restore();

  Glitch.draw(ctx, W, H);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);