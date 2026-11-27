// Save/load using localStorage. NFS-style package.

const KEY = 'glitch_runner_save_v1';

const DEFAULT = {
  cash: 0,
  heatRecord: 0,
  citiesUnlocked: ['neon_district'],
  currentCity: 'neon_district',
  ownedCars: ['starter'],
  equippedCar: 'starter',
  ownedParts: {},
  equippedParts: {},
  milestones: {},
  trialRecords: {},
  settings: {
    ctrlMode: 'wasd',
    audioVolume: 0.5,
    audioMuted: false,
  },
};

export const Save = {
  data: null,

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const mode = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches ? 'both' : 'wasd';
      this.data = { ...structuredClone(DEFAULT), ...parsed, settings: { ...DEFAULT.settings, ctrlMode: mode, ...parsed?.settings } };
    } catch (e) {
      this.data = structuredClone(DEFAULT);
    }
    return this.data;
  },

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (e) {}
  },

  reset() {
    this.data = structuredClone(DEFAULT);
    this.save();
  },
};
