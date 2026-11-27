// Handles keyboard, mouse, touch joystick, and touch action buttons.

import { Save } from './save.js';

export const Input = {
  keys: {},
  mouse: { x: 0, y: 0, down: false },
  axis: { x: 0, y: 0 },
  joystickActive: false,
  joystickVec: { x: 0, y: 0 },
  nitroHeld: false,
  driftHeld: false,
  mode: 'wasd',

  init(canvas) {
    this.canvas = canvas;
    this.mode = Save.data.settings.ctrlMode || 'wasd';

    window.addEventListener('keydown', e => {
      if (e.target?.closest?.('button, select, input, textarea')) return;
      if (e.key === ' ') e.preventDefault();
      this.keys[e.key.toLowerCase()] = true;
    });
    window.addEventListener('keyup',   e => { this.keys[e.key.toLowerCase()] = false; });

    window.addEventListener('mousemove', e => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
    });
    canvas.addEventListener('mousedown', () => this.mouse.down = true);
    window.addEventListener('mouseup',   () => this.mouse.down = false);

    this._initJoystick();
    this._initActionButton('btn-nitro', 'nitroHeld');
    this._initActionButton('btn-drift', 'driftHeld');
    window.addEventListener('blur', () => this.clear());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clear(); });
    this._applyModeVisibility();
  },

  setMode(mode) {
    this.clear();
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

    let pointer = null;
    const release = e => {
      if (e.pointerId !== pointer) return;
      pointer = null;
      resetKnob();
    };
    base.addEventListener('pointerdown', e => {
      if (pointer !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault();
      pointer = e.pointerId;
      base.setPointerCapture(pointer);
      updateFromTouch(e);
    });
    base.addEventListener('pointermove', e => {
      if (e.pointerId === pointer) updateFromTouch(e);
    });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) base.addEventListener(event, release);
    this._resetJoystick = () => { pointer = null; resetKnob(); };
  },

  _initActionButton(id, field) {
    const btn = document.getElementById(id);
    if (!btn) return;
    let pointer = null;
    btn.addEventListener('pointerdown', e => {
      if (pointer !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault();
      pointer = e.pointerId;
      btn.setPointerCapture(pointer);
      this[field] = true;
      btn.classList.add('active');
    });
    const reset = () => { pointer = null; this[field] = false; btn.classList.remove('active'); };
    const release = e => { if (e.pointerId === pointer) reset(); };
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) btn.addEventListener(event, release);
    (this._resetActions ??= []).push(reset);
  },

  clear() {
    this.keys = {};
    this.mouse.down = false;
    this.axis = { x: 0, y: 0 };
    this.joystickVec = { x: 0, y: 0 };
    this.joystickActive = false;
    this.nitroHeld = false;
    this.driftHeld = false;
    this._resetJoystick?.();
    for (const reset of this._resetActions ?? []) reset();
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
