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
  settings: {
    ctrlMode: 'wasd',
  },
};

export const Save = {
  data: null,

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      this.data = raw ? { ...DEFAULT, ...JSON.parse(raw) } : { ...DEFAULT };
    } catch (e) {
      this.data = { ...DEFAULT };
    }
    return this.data;
  },

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (e) {}
  },

  reset() {
    this.data = { ...DEFAULT };
    this.save();
  },
};