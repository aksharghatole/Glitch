// Hand-designed city layouts.

export const CITIES = {
  neon_district: {
    id: 'neon_district',
    name: 'NEON DISTRICT',
    width: 4000,
    height: 3000,
    roadWidth: 120,
    blockSize: 400,
    start: { x: 600, y: 600 },

    landmarks: [
      { type: 'tollgate', x: 1200, y: 600,  label: 'TOLLGATE' },
      { type: 'church',   x: 3000, y: 2200, label: 'CHURCH' },
      { type: 'parking',  x: 2400, y: 1200, label: 'PARKING LOT' },
    ],

    // Environment objects (Phase 2)
    nitroStrips: [
      { x: 600,  y: 660,  w: 220, h: 40 },
      { x: 2000, y: 660,  w: 220, h: 40 },
      { x: 600,  y: 1860, w: 220, h: 40 },
      { x: 3000, y: 2460, w: 220, h: 40 },
      { x: 660,  y: 1200, w: 40,  h: 220 },
      { x: 2460, y: 600,  w: 40,  h: 220 },
    ],
    ramps: [
      { x: 1500, y: 660,  w: 100, h: 60, dir: 'up' },
      { x: 2900, y: 1860, w: 100, h: 60, dir: 'up' },
      { x: 660,  y: 2500, w: 60,  h: 100, dir: 'right' },
    ],
    tunnels: [
      { x: 800,  y: 1860, w: 700, h: 120 },
      { x: 2800, y: 660,  w: 700, h: 120 },
    ],

    palette: {
      ground: '#08030f',
      road: '#0b0616',
      roadLine: 'rgba(0, 255, 255, 0.35)',
      building: '#12051c',
      buildingEdge: '#ff00d4',
      glow: '#00ffff',
    },
  },
};