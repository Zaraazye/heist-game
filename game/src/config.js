// The Gilded Hour — konfigurasi dunia & aturan.
// Museum malam: lantai biru gelap, spotlight emas, cone pengawas merah.

export const WORLD_W = 1280;
export const WORLD_H = 720;

export const COLORS = {
  floor: '#101a33',
  floorTile: '#16223f',
  wall: '#2b3a5e',
  wallEdge: '#4a5f8f',
  gold: '#f2c14e',
  goldBright: '#ffd97a',
  goldDim: '#8a6d2b',
  spotlight: '#ffe9a8',
  cone: '#ff3b30',
  coneSoft: 'rgba(255, 59, 48, 0.28)',
  laser: '#ff2d55',
  laserOff: '#5c1f2e',
  thief: '#e8ecf5',
  guard: '#7fb2ff',
  camera: '#9aa7c7',
  loot: '#f2c14e',
  diamond: '#aee9ff',
  velvet: '#7a1f2b',
  vent: '#3d5a73',
  exit: '#37d67a',
  text: '#eef2ff',
  textDim: '#9aa7c7',
};

export const THIEF_SPEED = 175;
export const THIEF_RADIUS = 14;
export const GUARD_SPEED = 92;
export const GUARD_SPEED_ALERT = 138;
export const CAMERA_SWEEP_SPEED = 0.55;

export const PICKUP_RADIUS = 38;
export const EXIT_RADIUS = 52;
export const SPOTTED_GRACE = 1.0; // detik peringatan SPOTTED sebelum alarm melonjak

export const LOOT_VALUES = {
  diamond: 5000,
  painting: 800,
};

export const TOOL_COSTS = {
  smoke: 150,
  noise: 100,
  disguise: 200,
};

// Biaya tool naik di Ghost (tool lebih mahal), turun sedikit di Casual.
export const TOOL_COST_MULTIPLIER = {
  casual: 0.8,
  professional: 1.0,
  ghost: 1.5,
};

export const DIFFICULTY = {
  casual: {
    id: 'casual',
    label: 'Casual',
    guardConeRange: 190,
    guardConeAngle: 1.05, // ~60 derajat
    cameraConeRange: 200,
    cameraConeAngle: 0.9,
    alarmRise: 26, // poin/detik saat terlihat
    alarmDecay: 9, // poin/detik saat bersembunyi
    laserOnTime: 1.6,
    laserOffTime: 2.4,
    guardSpeed: 82,
    alarmPenaltyPerPoint: 4,
  },
  professional: {
    id: 'professional',
    label: 'Professional',
    guardConeRange: 240,
    guardConeAngle: 1.22, // ~70 derajat
    cameraConeRange: 250,
    cameraConeAngle: 1.05,
    alarmRise: 38,
    alarmDecay: 6,
    laserOnTime: 2.0,
    laserOffTime: 1.6,
    guardSpeed: 92,
    alarmPenaltyPerPoint: 6,
  },
  ghost: {
    id: 'ghost',
    label: 'Ghost',
    guardConeRange: 300,
    guardConeAngle: 1.4, // ~80 derajat
    cameraConeRange: 300,
    cameraConeAngle: 1.22,
    alarmRise: 55,
    alarmDecay: 3.5,
    laserOnTime: 2.4,
    laserOffTime: 1.1,
    guardSpeed: 108,
    alarmPenaltyPerPoint: 8,
  },
};

export function difficultySettings(id) {
  return DIFFICULTY[id] || DIFFICULTY.professional;
}

export function toolCost(toolId, difficultyId) {
  const base = TOOL_COSTS[toolId] || 0;
  const mult = TOOL_COST_MULTIPLIER[difficultyId] || 1.0;
  return Math.round(base * mult);
}
