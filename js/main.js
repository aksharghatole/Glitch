// Entry point — Phase 3.1 (cops + heat + pursuit + busted + props).

import { Save } from './save.js';
import { TimeTrial, recordTrial } from './activities.js';
import { ACTIVITIES, StreetRace, recordRace } from './races.js';
import { Audio } from './audio.js';
import { Input } from './input.js';
import { Camera } from './camera.js';
import { World } from './world.js';
import { Car } from './car.js';
import { UI } from './ui.js';
import { Glitch } from './glitch.js';
import { Impact } from './impact.js';
import { Trails } from './drift-trails.js';
import { NitroFX } from './nitro.js';
import { Heat } from './heat.js';
import { CopsManager } from './cops.js';
import { Props } from './props.js';
import { TrafficManager } from './traffic.js';
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
Audio.setVolume(Save.data.settings.audioVolume);
Audio.setMuted(Save.data.settings.audioMuted);
const volume = document.getElementById('audio-volume');
const mute = document.getElementById('audio-mute');
function syncAudioControls() {
  volume.value = Math.round(Audio.volume * 100);
  mute.checked = Audio.muted;
  document.getElementById('btn-sound').textContent = Audio.muted ? 'SOUND OFF' : 'SOUND ON';
  document.getElementById('btn-sound').setAttribute('aria-pressed', String(!Audio.muted));
}
function persistAudio() {
  Save.data.settings.audioVolume = Audio.volume;
  Save.data.settings.audioMuted = Audio.muted;
  Save.save(); syncAudioControls();
}
volume.addEventListener('input', () => { Audio.setVolume(Number(volume.value)/100); persistAudio(); });
mute.addEventListener('change', () => { Audio.setMuted(mute.checked); persistAudio(); if (!Audio.muted) void Audio.unlock(); });
document.getElementById('btn-sound').addEventListener('click', () => { Audio.setMuted(!Audio.muted); persistAudio(); if (!Audio.muted) void Audio.unlock(); });
syncAudioControls();
document.addEventListener('visibilitychange', () => { if (document.hidden) Audio.update(null,[],0,false,0); });

const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
function applyMotionPreference() {
  Impact.setReducedMotion(motion.matches);
  Trails.setReducedMotion(motion.matches);
  Glitch.setReducedMotion(motion.matches);
  Camera.setReducedMotion(motion.matches);
}
applyMotionPreference();
motion.addEventListener?.('change', applyMotionPreference);

const game = {
  running: false,
  busted: false,
  world: null,
  car: null,
  cops: null,
  props: null,
  traffic: null,
  pinnedTimer: 0,
  trial: null,
};

function initWorld() {
  const cityId = Save.data.currentCity || 'neon_district';
  game.world = new World(cityId);
  game.trial = null;
  const start = game.world.city.start;
  game.car = new Car(start.x, start.y);
  game.cops = new CopsManager(game.world);
  game.props = new Props(game.world);
  game.traffic = new TrafficManager(game.world);
  Heat.reset();
  Impact.reset();
  Trails.reset();
  Glitch.pulse = 0;
  Camera.shake = 0;
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
  game.trial?.fail(reason);
  document.getElementById('trial-result').hidden = true;
  Glitch.trigger(30);
  Camera.addShake(20);

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

const trialHUD = document.getElementById('trial-hud');
const trialResult = document.getElementById('trial-result');
const trialSelect = document.getElementById('trial-select');
function refreshTrials() {
  trialSelect.replaceChildren();
  for (const route of ACTIVITIES.filter(r => r.city === game.world.city.id)) {
    const option = document.createElement('option');
    option.value = route.id;
    const race = route.mode === 'race';
    const best = race ? Save.data.raceRecords?.[route.id]?.elapsed : Save.data.trialRecords?.[route.id];
    option.textContent = (race ? 'RACE · ' : 'TRIAL · ') + route.name + ' · ' + route.limit + 's · $' + route.reward +
      (Number.isFinite(best) ? ' · PB ' + best.toFixed(2) + 's' : '');
    trialSelect.append(option);
  }
  document.getElementById('btn-trial').disabled = !trialSelect.options.length;
}
function startTrial(route) {
  if (!route) return;
  void Audio.unlock();
  initWorld();
  game.trial = route.mode === 'race' ? new StreetRace(route) : new TimeTrial(route);
  const start = route.points[0];
  game.car.x = Camera.x = start.x;
  game.car.y = Camera.y = start.y;
  Input.clear();
  trialResult.hidden = true;
  UI.hideOverlay();
  game.running = true;
  game.busted = false;
  refreshTrialHUD();
}
function refreshTrialHUD() {
  const t = game.trial;
  trialHUD.hidden = !t || !game.running;
  document.getElementById('cash').textContent = '$' + Math.floor(Save.data.cash || 0);
  if (!t || !game.running) return;
  trialHUD.textContent = t.state === 'countdown' ? 'GET READY · ' + Math.ceil(t.countdown) :
    t.route.name + ' · ' + Math.min(t.index,t.route.points.length-1) + '/' +
    (t.route.points.length-1) + ' · ' + t.remaining.toFixed(1) + 's' +
    (t.route.mode === 'race' ? ' · P'+t.position+'/4' : '');
}
function finishTrial() {
  const t = game.trial;
  game.running = false;
  Input.clear();
  const race = t.route.mode === 'race';
  const earned = race ? recordRace(Save.data,t.route,t.result) : recordTrial(Save.data,t.route,t.result);
  if (earned) Save.save();
  document.getElementById('trial-title').textContent = earned ? (race ? 'RACE COMPLETE · P'+earned.position+'/4' : 'TRIAL COMPLETE') : (race ? 'RACE FAILED' : 'TRIAL FAILED');
  document.getElementById('trial-summary').textContent = earned ?
    t.elapsed.toFixed(2) + 's · +$' + earned.reward + (earned.personalBest ? ' · NEW BEST' : '') : t.result.reason;
  trialResult.hidden = false;
  refreshTrialHUD();
}
function freeRoam() {
  trialResult.hidden = true;
  initWorld();
  Input.clear();
  game.running = true;
  UI.hideOverlay();
  refreshTrialHUD();
}
document.getElementById('btn-trial').addEventListener('click', () => startTrial(ACTIVITIES.find(r => r.id === trialSelect.value)));
document.getElementById('btn-retry-trial').addEventListener('click', () => startTrial(game.trial?.route));
document.getElementById('btn-free-roam').addEventListener('click', freeRoam);
document.getElementById('btn-activities').addEventListener('click', () => {
  if (!game.running || game.busted) return;
  game.trial?.fail('ABANDONED');
  game.running = false;
  Input.clear();
  refreshTrials();
  refreshTrialHUD();
  UI.showOverlay();
});

function respawn() {
  void Audio.unlock();
  const el = document.getElementById('busted-screen');
  if (el) el.classList.remove('show');
  game.busted = false;
  const route=game.trial?.route;
  if(route) { startTrial(route); return; }
  initWorld();
  game.running = true;
  refreshTrialHUD();
}

UI.init({
  onStart: () => {
    void Audio.unlock();
    if (game.busted) { respawn(); return; }
    if(game.trial) { freeRoam(); return; }
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
refreshTrials();
refreshTrialHUD();

let last = performance.now();

function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

  if(game.running && game.trial?.state==='countdown') {
    game.trial.update(dt,game.car);
    refreshTrialHUD();
  } else if (game.running && !game.busted) {
    game.car.update(dt, game.world);

    if (!game.car.airborne) resolveBuildingCollision(game.car, game.world);
    clampToWorld(game.car, game.world);

    game.world.update(dt);

    // Cops + props + heat
    game.cops.update(dt, game.car);
    game.props.update(dt, game.car);
    game.traffic.update(dt, game.car);
    if (!game.car.airborne) resolveBuildingCollision(game.car, game.world);
    clampToWorld(game.car, game.world);
    Heat.update(dt, game.cops.activeCount, game.car);

    // Busted condition 1: health = 0
    if (game.car.health <= 0) busted('CAR DESTROYED');

    // Busted condition 2: surrounded while slow
    const copCount = game.cops.nearbyGroundCount;
    const sp = Math.hypot(game.car.vx, game.car.vy);
    const surrounded = copCount >= 4 && sp < 60;
    if (surrounded) {
      game.pinnedTimer += dt;
      if (game.pinnedTimer > 2.5) busted('SURROUNDED');
    } else {
      game.pinnedTimer = 0;
    }

    Camera.follow(game.car, dt);
    if (Math.random() < 1 - Math.pow(0.998, dt * 60)) Glitch.trigger(8);

    if(game.running && game.trial) {
      game.trial.update(dt,game.car);
      if(game.trial.result) finishTrial();
    }
    refreshTrialHUD();
    UI.updateHUD(game.car, Heat.wholeStars);
  }

  Audio.update(game.car, game.cops.cops, Math.hypot(Input.axis.x, Input.axis.y), game.running && !document.hidden, now/1000);
  Trails.update(dt, game.running ? game.car : null);
  Impact.update(dt);
  Glitch.update(dt);
  Camera.updateEffects(dt);

  // ===== Draw =====
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#05010f';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  Camera.apply(ctx, W, H);

  if (game.world) game.world.draw(ctx);
  game.trial?.draw(ctx);
  Trails.draw(ctx);
  if (game.props) game.props.draw(ctx);
  const night = 1 - (game.world?.dayNight ?? 0.5);
  if (game.traffic) game.traffic.draw(ctx, game.car, Math.hypot(W, H) / (2 * Camera.zoom) + 100, night);
  if (game.cops)  game.cops.draw(ctx, night);
  game.trial?.drawRivals?.(ctx,night);
  if (game.car)   game.car.draw(ctx, night);
  Impact.draw(ctx);

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

  if (game.car && !motion.matches) NitroFX.draw(ctx, W, H, game.car);
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

  ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
  ctx.fillStyle = 'rgba(0, 255, 255, 0.05)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
  ctx.stroke();

  ctx.fillStyle = '#0ff';
  ctx.shadowColor = '#0ff';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();

  game.cops.drawOnRadar(ctx, game.car, cx, cy, r);
  for(const rival of game.trial?.rivals ?? []){
    const dx=rival.x-game.car.x,dy=rival.y-game.car.y;
    const scale=(r-6)/Math.max(2000,Math.hypot(dx,dy));
    ctx.fillStyle=rival.color;ctx.beginPath();ctx.arc(cx+dx*scale,cy+dy*scale,3,0,Math.PI*2);ctx.fill();
  }
  const target=game.trial?.target;
  if(target){
    const dx=target.x-game.car.x,dy=target.y-game.car.y;
    const scale=(r-6)/Math.max(2000,Math.hypot(dx,dy));
    ctx.fillStyle='#ffe66b';ctx.beginPath();ctx.arc(cx+dx*scale,cy+dy*scale,5,0,Math.PI*2);ctx.fill();
  }

  ctx.restore();
}

requestAnimationFrame(loop);
