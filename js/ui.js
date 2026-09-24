// HUD + menu wiring.

export const UI = {
  els: {},
  lastHeatShown: 0,

  init({ onStart, onOpenSettings, onCloseSettings, onSetCtrlMode }) {
    this.els = {
      overlay: document.getElementById('overlay'),
      settings: document.getElementById('settings-panel'),
      btnStart: document.getElementById('btn-start'),
      btnSettings: document.getElementById('btn-settings'),
      btnCloseSettings: document.getElementById('btn-close-settings'),
      ctrlMode: document.getElementById('ctrl-mode'),
      heat: document.getElementById('heat'),
      speed: document.getElementById('speed'),
      nitroFill: document.getElementById('nitro-fill'),
    };

    this.els.btnStart.addEventListener('click', onStart);
    this.els.btnSettings.addEventListener('click', onOpenSettings);
    this.els.btnCloseSettings.addEventListener('click', onCloseSettings);
    this.els.ctrlMode.addEventListener('change', (e) => onSetCtrlMode(e.target.value));
  },

  hideOverlay() { this.els.overlay.classList.add('hide'); },
  showOverlay() { this.els.overlay.classList.remove('hide'); },
  showSettings() { this.els.settings.classList.remove('hidden'); },
  hideSettings() { this.els.settings.classList.add('hidden'); },
  setCtrlMode(mode) { this.els.ctrlMode.value = mode; },

  updateHUD(car, heatStars = 0) {
    this.els.speed.textContent = car.speedKmh + ' KM/H';
    this.els.nitroFill.style.width = car.nitro + '%';

    if (this.els.heat) {
      // Show fractional stars below 1 as decimals, above 1 as whole
      const shown = heatStars < 1
        ? Math.round(heatStars * 10) / 10
        : heatStars;
      this.els.heat.textContent = '★ ' + shown;

      // Flash on increase
      if (heatStars > this.lastHeatShown) {
        this.els.heat.style.transform = 'scale(1.3)';
        this.els.heat.style.color = '#ffffff';
        setTimeout(() => {
          this.els.heat.style.transform = 'scale(1)';
          this.els.heat.style.color = '';
        }, 120);
      }
      this.lastHeatShown = heatStars;
    }
  },
};