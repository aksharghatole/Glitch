// Hand-designed city layouts. Each city = a grid of blocks with roads between.
// Coordinates are in world pixels. Start simple; expand later phases.

export const CITIES = {
  neon_district: {
    id: 'neon_district',
    name: 'NEON DISTRICT',
    width: 4000,
    height: 3000,
    roadWidth: 120,
    blockSize: 400,
    start: { x: 600, y: 600 },
    // Buildings are generated from the grid, but here's how to override:
    landmarks: [
      { type: 'tollgate', x: 1200, y: 600, label: 'TOLLGATE' },
      { type: 'church',   x: 3000, y: 2200, label: 'CHURCH' },
      { type: 'parking',  x: 2400, y: 1200, label: 'PARKING LOT' },
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