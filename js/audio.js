// Original synthesized sound effects; no external audio assets.
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export function audioMix(car, cops = [], throttle = 0, time = 0) {
  const speed = Math.max(0, Math.hypot(car.vx, car.vy));
  const gear = Math.min(5, Math.floor(speed / 90));
  const rev = (speed - gear * 90) / 90;
  const rpm = clamp(0.22 + rev * 0.7 + throttle * 0.13, 0, 1);
  let siren = 0;
  for (const cop of cops) {
    if (cop.cfg?.stealth && !cop.closeToPlayer) continue;
    const d = Math.hypot(cop.x - car.x, cop.y - car.y);
    siren = Math.max(siren, Math.max(0, 1 - d / 850));
  }
  return {
    engineHz: 32 + rpm * 95,
    engineGain: 0.055 + throttle * 0.045 + Math.min(1,speed/420)*0.035,
    gear, boostGain: car.nitroActive ? 0.075 : 0,
    driftGain: car.drifting && !car.airborne ? 0.09 : 0,
    sirenGain: siren * 0.065,
    sirenHz: 730 + Math.sin(time * Math.PI * 1.7) * 220,
  };
}

export class GameAudio {
  constructor(factory = () => {
    const C = globalThis.AudioContext || globalThis.webkitAudioContext;
    return C ? new C() : null;
  }) {
    this.factory = factory;
    this.context = null;
    this.volume = 0.5;
    this.muted = false;
    this.active = false;
    this.lastHit = -Infinity;
    this.lastGear = null;
  }

  async unlock() {
    try {
      if (!this.context) {
        const c = this.factory();
        if (!c) return false;
        this.context = c;
        this.master = c.createGain();
        this.master.gain.value = 0;
        this.master.connect(c.destination);
        this.engine = this.tone('triangle', 50);
        this.harmonic = this.tone('sawtooth', 100);
        this.siren = this.tone('sine', 750);
        this.boost = this.noise(950, 'bandpass');
        this.drift = this.noise(1800, 'bandpass');
        this.applyVolume();
      }
      if (this.context.state === 'suspended') await this.context.resume();
      return this.context.state === 'running';
    } catch {
      return false;
    }
  }

  tone(type, hz) {
    const c = this.context, source = c.createOscillator(), gain = c.createGain();
    source.type = type; source.frequency.value = hz; gain.gain.value = 0;
    source.connect(gain); gain.connect(this.master); source.start();
    return {source, gain};
  }

  noise(hz, type) {
    const c = this.context, source = c.createBufferSource();
    if (!this.noiseBuffer) {
      this.noiseBuffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i=0;i<data.length;i++) data[i] = Math.random()*2-1;
    }
    source.buffer = this.noiseBuffer; source.loop = true;
    const filter = c.createBiquadFilter(), gain = c.createGain();
    filter.type = type; filter.frequency.value = hz; filter.Q.value = 0.8; gain.gain.value = 0;
    source.connect(filter); filter.connect(gain); gain.connect(this.master); source.start();
    return {source, gain, filter};
  }

  target(param, value, tau = 0.06) {
    param.setTargetAtTime(value, this.context.currentTime, tau);
  }

  setVolume(value) {
    this.volume = Number.isFinite(value) ? clamp(value,0,1) : 0.5;
    this.applyVolume();
  }

  setMuted(value) { this.muted = Boolean(value); this.applyVolume(); }
  applyVolume() {
    if (this.master) this.target(this.master.gain, this.muted ? 0 : this.volume, 0.025);
  }

  update(car, cops, throttle, running, time) {
    if (!this.context || !this.engine) return;
    this.active = Boolean(running);
    if (!this.active || this.context.state !== 'running') {
      for (const voice of [this.engine,this.harmonic,this.siren,this.boost,this.drift]) this.target(voice.gain.gain,0);
      this.lastGear = null;
      return;
    }
    const mix = audioMix(car,cops,clamp(throttle,0,1),time);
    const shifted = this.lastGear !== null && this.lastGear !== mix.gear;
    this.lastGear = mix.gear;
    this.target(this.engine.source.frequency,mix.engineHz,shifted ? 0.13 : 0.045);
    this.target(this.harmonic.source.frequency,mix.engineHz*2);
    this.target(this.engine.gain.gain,mix.engineGain);
    this.target(this.harmonic.gain.gain,mix.engineGain*0.24);
    this.target(this.siren.source.frequency,mix.sirenHz);
    this.target(this.siren.gain.gain,mix.sirenGain);
    this.target(this.boost.gain.gain,mix.boostGain);
    this.target(this.drift.gain.gain,mix.driftGain);
  }

  hit(speed) {
    const c = this.context;
    if (!c || !this.active || this.muted || c.state !== 'running' ||
      !this.noiseBuffer || speed < 75 || c.currentTime-this.lastHit < 0.12) return;
    this.lastHit = c.currentTime;
    const power = clamp(speed/420,0,1);
    const source = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = 'lowpass'; filter.frequency.value = 450 + power*1700;
    const t=c.currentTime;
    gain.gain.setValueAtTime(0.1+power*0.16,t);
    gain.gain.exponentialRampToValueAtTime(0.001,t+0.16);
    source.connect(filter); filter.connect(gain); gain.connect(this.master);
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
    source.start(t); source.stop(t+0.18);
  }
}
export const Audio = new GameAudio();
