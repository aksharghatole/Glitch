// All 7 cop types with stats. Heat = minimum stars to spawn.

export const COP_TYPES = {
  patrol: {
    id: 'patrol',
    name: 'PATROL',
    minHeat: 1,
    maxHeat: 10,
    color: '#2266ff',
    accent: '#ffffff',
    speed: 260,
    accel: 400,
    health: 60,
    ram: 8,
    radius: 20,
    weight: 1,
    weightType: 'patrol',
  },
  interceptor: {
    id: 'interceptor',
    name: 'INTERCEPTOR',
    minHeat: 3,
    maxHeat: 10,
    color: '#00aaff',
    accent: '#ffffff',
    speed: 380,
    accel: 620,
    health: 55,
    ram: 10,
    radius: 20,
    weight: 1,
  },
  suv: {
    id: 'suv',
    name: 'RHINO',
    minHeat: 4,
    maxHeat: 10,
    color: '#334466',
    accent: '#ffcc00',
    speed: 240,
    accel: 420,
    health: 140,
    ram: 20,
    radius: 28,
    weight: 2.5,
  },
  roadblock: {
    id: 'roadblock',
    name: 'ROADBLOCK',
    minHeat: 4,
    maxHeat: 10,
    color: '#223355',
    accent: '#ff2200',
    speed: 0,           // static
    accel: 0,
    health: 200,
    ram: 25,
    radius: 30,
    weight: 4,
    static: true,
  },
  helicopter: {
    id: 'helicopter',
    name: 'AIR UNIT',
    minHeat: 5,
    maxHeat: 10,
    color: '#0a0a0a',
    accent: '#ffee00',
    speed: 320,
    accel: 500,
    health: 9999,        // can't kill
    ram: 0,
    radius: 24,
    weight: 999,
    flying: true,
  },
  undercover: {
    id: 'undercover',
    name: 'UNDERCOVER',
    minHeat: 6,
    maxHeat: 10,
    color: '#1a1a1a',
    accent: '#ff00d4',
    speed: 400,
    accel: 660,
    health: 60,
    ram: 12,
    radius: 20,
    weight: 1,
    stealth: true,      // no siren until close
  },
  federal: {
    id: 'federal',
    name: 'FEDERAL',
    minHeat: 8,
    maxHeat: 10,
    color: '#0d0d0d',
    accent: '#ff3300',
    speed: 440,
    accel: 720,
    health: 100,
    ram: 18,
    radius: 22,
    weight: 1.8,
  },
};

// Active spawn table by heat level (weighted picks)
export function getSpawnTable(heat) {
  const table = [];
  for (const key in COP_TYPES) {
    const c = COP_TYPES[key];
    if (c.static) continue;      // roadblocks handled separately
    if (heat >= c.minHeat && heat <= c.maxHeat) {
      table.push({ id: key, weight: 1 + (c.maxHeat - c.minHeat) - (heat - c.minHeat) * 0.15 });
    }
  }
  return table;
}

export function pickCopType(heat) {
  const table = getSpawnTable(heat);
  if (!table.length) return 'patrol';
  const total = table.reduce((s, e) => s + Math.max(0.1, e.weight), 0);
  let r = Math.random() * total;
  for (const e of table) {
    r -= Math.max(0.1, e.weight);
    if (r <= 0) return e.id;
  }
  return 'patrol';
}

// Total concurrent cop cap based on heat
export function maxCopsForHeat(heat) {
  return Math.min(2 + heat * 1.5, 18);
}