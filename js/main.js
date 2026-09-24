// Entry point.

import { Save } from './save.js';
import { Input } from './input.js';
import { Camera } from './camera.js';
import { World } from './world.js';
import { Car } from './car.js';
import { UI } from './ui.js';
import { Glitch } from './glitch.js';
import { NitroFX } from './nitro.js';
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
  Camera.baseZoom = 0.85;
  Camera.targetZoom = 0.85;
}

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
Input.init(canvas);
initWorld();

let last = performance.now();

function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

  if (game.running) {
    game.car.update(dt, game.world);

    if (!game.car.airborne) {
      resolveBuildingCollision(game.car, game.world);
    }
    clampToWorld(game.car, game.world);

    game.world.update(dt);
    Camera.follow(game.car, dt);
    Glitch.update();

    if (Math.random() < 0.002) Glitch.trigger(8);

    UI.updateHUD(game.car);
  }

  // ===== Draw =====
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#05010f';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  Camera.apply(ctx, W, H);

  if (game.world) game.world.draw(ctx);
  if (game.car)   game.car.draw(ctx);

  ctx.restore();

  // Day/night tint (screen-space)
  if (game.world) {
    const n = game.world.dayNight;
    // night 0 → dark overlay; day 1 → none
    const nightStrength = (1 - n) * 0.35;
    if (nightStrength > 0) {
      ctx.fillStyle = `rgba(20, 0, 60, ${nightStrength})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // Nitro FX
  if (game.car) NitroFX.draw(ctx, W, H, game.car);

  Glitch.draw(ctx, W, H);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);