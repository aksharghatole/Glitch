// Handles keyboard, mouse, touch joystick, and touch action buttons.

import { Save } from './save.js';

export const Input = {
  keys: {},
  mouse: { x: 0, y: 0, down: false },
  axis: { x: 0, y: 0 },
  joystickActive: false,
  joystickVec: { x: 0, y: 0 },
  nitroHeld: false,          // NEW
  mode: 'wasd',

  init(canvas) {
    this.canvas = canvas;
    this.mode = Save.data.settings.ctrlMode || 'wasd';

    window.addEventListener('keydown', e => { this.keys[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup',   e => { this.keys[e.key.toLowerCase()] = false; });

    window.addEventListener('mousemove', e => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
    });
    window.addEventListener('mousedown', () => this.mouse.down = true);
    window.addEventListener('mouseup',   () => this.mouse.down = false);

    this._initJoystick();
    this._initNitroButton();
    this._applyModeVisibility();
  },

  setMode(mode) {
    this.mode = mode;
    this._applyModeVisibility();
    Save.data.settings.ctrlMode = mode;
    Save.save();
  },

  _applyModeVisibility() {
    const zone = document.getElementById('joystick-zone');
    if (!zone) return;
    if (this.mode === 'joystick' || this.mode === 'both') zone.classList.add('show');
    else zone.classList.remove('show');
  },

  _initJoystick() {
    const base = document.getElementById('joystick-base');
    const knob = document.getElementById('joystick-knob');
    if (!base || !knob) return;

    const R = 46;
    const setKnob = (dx, dy) => {
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };
    const resetKnob = () => {
      setKnob(0, 0);
      this.joystickVec = { x: 0, y: 0 };
      this.joystickActive = false;
    };
    const updateFromTouch = (touch) => {
      const rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = touch.clientX - cx;
      let dy = touch.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > R) { dx = (dx / dist) * R; dy = (dy / dist) * R; }
      setKnob(dx, dy);
      this.joystickVec = { x: dx / R, y: dy / R };
      this.joystickActive = true;
    };

    base.addEventListener('touchstart', e => { e.preventDefault(); updateFromTouch(e.touches[0]); }, { passive: false });
    base.addEventListener('touchmove',  e => { e.preventDefault(); if (e.touches.length) updateFromTouch(e.touches[0]); }, { passive: false });
    base.addEventListener('touchend',   e => { e.preventDefault(); resetKnob(); }, { passive: false });
    base.addEventListener('touchcancel', resetKnob);

    let mouseDown = false;
    base.addEventListener('mousedown', e => { mouseDown = true; updateFromTouch(e); });
    window.addEventListener('mousemove', e => { if (mouseDown) updateFromTouch(e); });
    window.addEventListener('mouseup', () => { if (mouseDown) { mouseDown = false; resetKnob(); } });
  },

  // NEW: nitro button wiring
  _initNitroButton() {
    const btn = document.getElementById('btn-nitro');
    if (!btn) return;

    const press   = e => { e.preventDefault(); this.nitroHeld = true;  btn.classList.add('active'); };
    const release = e => { e.preventDefault(); this.nitroHeld = false; btn.classList.remove('active'); };

    btn.addEventListener('touchstart',  press,   { passive: false });
    btn.addEventListener('touchend',    release, { passive: false });
    btn.addEventListener('touchcancel', release, { passive: false });
    btn.addEventListener('mousedown',   press);
    btn.addEventListener('mouseup',     release);
    btn.addEventListener('mouseleave',  release);
  },

  update() {
    let x = 0, y = 0;

    if (this.mode === 'wasd' || this.mode === 'both') {
      if (this.keys['a']) x -= 1;
      if (this.keys['d']) x += 1;
      if (this.keys['w']) y -= 1;
      if (this.keys['s']) y += 1;
    }
    if ((this.mode === 'joystick' || this.mode === 'both') && this.joystickActive) {
      x += this.joystickVec.x;
      y += this.joystickVec.y;
    }

    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    this.axis.x = x;
    this.axis.y = y;
  },
};