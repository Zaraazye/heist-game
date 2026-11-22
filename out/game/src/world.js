// The Gilded Hour — dunia & aturan main.
// Satu ruangan museum 1280x720, top-down.
// Pintu masuk kiri bawah -> vault + Berlian Gilded kanan atas ->
// pintu darurat kanan bawah. 3 lukisan opsional, tali beludru (cover),
// ventilasi (rute aman sempit), grid laser (rute cepat berwaktu).

import {
  WORLD_W,
  WORLD_H,
  THIEF_SPEED,
  THIEF_RADIUS,
  PICKUP_RADIUS,
  EXIT_RADIUS,
  SPOTTED_GRACE,
  LOOT_VALUES,
  difficultySettings,
} from './config.js';
import { createRng } from './random.js';
import { createGuard, updateGuard, guardSeesThief } from './guard.js';
import { createCamera, updateCamera, cameraSeesThief } from './camera.js';
import { useTool } from './tools.js';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function circleHitsRect(cx, cy, r, rect) {
  const nx = clamp(cx, rect.x, rect.x + rect.w);
  const ny = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

// Layout ruangan. Dinding luar implisit (batas 1280x720); walls di sini
// adalah etalase / partisi dalam yang menghalangi gerak & garis pandang.
function buildLayout(rng) {
  const walls = [
    // Etalase tengah (pulau display) — penghalang garis pandang utama.
    { x: 520, y: 300, w: 200, h: 60 },
    // Partisi kiri-tengah.
    { x: 300, y: 420, w: 60, h: 160 },
    // Partisi kanan-tengah (dekat laser).
    { x: 900, y: 380, w: 60, h: 140 },
    // Dinding vault: hanya celah pintu di sisi bawah vault.
    { x: 1060, y: 40, w: 180, h: 20 },
    { x: 1060, y: 40, w: 20, h: 150 },
  ];
  // Variasi kecil deterministik: geser etalase tengah +-12px dari seed.
  walls[0].x += Math.round(rng.range(-12, 12));
  return {
    walls,
    entrance: { x: 70, y: 640 },
    vault: { x: 1060, y: 40, w: 180, h: 150 },
    exit: { x: 1210, y: 640 },
    // Tali beludru = cover: bersembunyi di sini, guard/kamera tak melihat.
    covers: [
      { x: 180, y: 180, w: 130, h: 60 },
      { x: 620, y: 520, w: 130, h: 60 },
      { x: 980, y: 150, w: 110, h: 50 },
    ],
    // Ventilasi: koridor sempit di dinding atas, rute aman (tak ada cone).
    vent: { x: 420, y: 24, w: 360, h: 36 },
    // Grid laser vertikal di x=760: rute cepat, menyala/ mati bergantian.
    lasers: [
      { x: 760, y: 170, w: 10, h: 180 },
      { x: 760, y: 390, w: 10, h: 170 },
    ],
  };
}

export function createWorld(difficulty = 'professional', seed = 1337) {
  const diff = difficultySettings(difficulty);
  const rng = createRng(seed);
  const layout = buildLayout(rng);

  const guards = [
    createGuard(
      [
        { x: 350, y: 200 },
        { x: 700, y: 200 },
        { x: 700, y: 500 },
        { x: 350, y: 500 },
      ],
      { difficulty, speed: diff.guardSpeed, coneRange: diff.guardConeRange, coneAngle: diff.guardConeAngle },
    ),
    createGuard(
      [
        { x: 950, y: 480 },
        { x: 1150, y: 480 },
        { x: 1150, y: 260 },
        { x: 950, y: 260 },
      ],
      { difficulty, speed: diff.guardSpeed, coneRange: diff.guardConeRange, coneAngle: diff.guardConeAngle },
    ),
  ];

  const cameras = [
    createCamera(640, 30, Math.PI / 2, {
      difficulty,
      coneRange: diff.cameraConeRange,
      coneAngle: diff.cameraConeAngle,
      sweepRange: 0.8,
      phase: 0,
    }),
    createCamera(1240, 360, Math.PI, {
      difficulty,
      coneRange: diff.cameraConeRange,
      coneAngle: diff.cameraConeAngle,
      sweepRange: 0.6,
      phase: 1.6,
    }),
  ];

  return {
    difficulty,
    state: 'title',
    time: 0,
    alarm: 0,
    score: 0,
    thief: {
      x: layout.entrance.x,
      y: layout.entrance.y,
      dir: -Math.PI / 2,
      speed: THIEF_SPEED,
      hasDiamond: false,
      disguisedUntil: 0,
      hidden: false,
    },
    guards,
    cameras,
    loot: {
      diamond: { x: 1150, y: 115, taken: false },
      paintings: [
        { x: 300, y: 120, taken: false, value: LOOT_VALUES.painting },
        { x: 640, y: 90, taken: false, value: LOOT_VALUES.painting },
        { x: 950, y: 300, taken: false, value: LOOT_VALUES.painting },
      ],
    },
    tools: { smoke: 1, noise: 1, disguise: 1 },
    effects: [],
    stats: { lootValue: 0, toolsUsed: 0, peakAlarm: 0, time: 0 },
    // Data layout tambahan untuk renderer (Worker 2).
    walls: layout.walls,
    covers: layout.covers,
    vent: layout.vent,
    lasers: layout.lasers,
    entrance: layout.entrance,
    vault: layout.vault,
    exit: layout.exit,
    laserOn: true,
    laserTimer: 0,
    spotted: false,
    spottedTimer: 0,
    toolCostSpent: 0,
    message: '',
  };
}

function moveThief(world, input, dt) {
  const thief = world.thief;
  let mx = 0;
  let my = 0;
  if (input) {
    if (input.move) {
      mx = input.move.x || 0;
      my = input.move.y || 0;
    } else {
      if (input.left) mx -= 1;
      if (input.right) mx += 1;
      if (input.up) my -= 1;
      if (input.down) my += 1;
      if (input.dx) mx += input.dx;
      if (input.dy) my += input.dy;
    }
  }
  const len = Math.hypot(mx, my);
  if (len < 0.01) return;
  mx /= len;
  my /= len;
  thief.dir = Math.atan2(my, mx);

  // Gerak per sumbu (tabrakan dinding per sumbu, jadi bisa geser di tepi).
  const step = thief.speed * dt;
  const nx = clamp(thief.x + mx * step, THIEF_RADIUS, WORLD_W - THIEF_RADIUS);
  if (!world.walls.some((w) => circleHitsRect(nx, thief.y, THIEF_RADIUS, w))) {
    thief.x = nx;
  }
  const ny = clamp(thief.y + my * step, THIEF_RADIUS, WORLD_H - THIEF_RADIUS);
  if (!world.walls.some((w) => circleHitsRect(thief.x, ny, THIEF_RADIUS, w))) {
    thief.y = ny;
  }
}

function thiefInLaser(world) {
  if (!world.laserOn) return false;
  for (const l of world.lasers) {
    if (pointInRect(world.thief.x, world.thief.y, l)) return true;
  }
  return false;
}

export function finalScore(world) {
  const diff = difficultySettings(world.difficulty);
  const penalty = Math.round(world.stats.peakAlarm * diff.alarmPenaltyPerPoint);
  return world.stats.lootValue - (world.toolCostSpent || 0) - penalty;
}

export function gradeFor(world) {
  const score = finalScore(world);
  const t = world.stats.time;
  const peak = world.stats.peakAlarm;
  if (score >= 5800 && t <= 150 && peak <= 25) return 'S';
  if (score >= 5000 && peak <= 50) return 'A';
  if (score >= 3000) return 'B';
  return 'C';
}

function finishRun(world, won) {
  world.state = won ? 'victory' : 'caught';
  world.stats.time = world.time;
  world.score = finalScore(world);
  world.stats.grade = gradeFor(world);
  world.stats.finalScore = world.score;
  world.message = won
    ? `KABUR! Berlian Gilded aman. Skor ${world.score} — Grade ${world.stats.grade}`
    : `TERTANGKAP! Alarm 100. Skor ${world.score} — Grade ${world.stats.grade}`;
}

export function updateWorld(world, input, dt) {
  if (!world || dt <= 0) return world;

  // Title -> play lewat input.start.
  if (world.state === 'title') {
    if (input && input.start) {
      world.state = 'play';
      world.message = 'Curi Berlian Gilded, lalu kabur lewat pintu darurat!';
    }
    return world;
  }
  if (world.state !== 'play') return world;

  const diff = difficultySettings(world.difficulty);
  world.time += dt;
  world.stats.time = world.time;

  // Tool dipakai dari input (sekali per frame).
  if (input && input.useTool) {
    useTool(world, input.useTool, input.toolX, input.toolY);
  }

  moveThief(world, input, dt);

  // Hidden: di dalam tali beludru ATAU ventilasi (dan tidak sedang di laser).
  const t = world.thief;
  t.hidden =
    world.covers.some((c) => pointInRect(t.x, t.y, c)) ||
    pointInRect(t.x, t.y, world.vent);

  // Laser berwaktu: nyala/mati bergantian sesuai difficulty.
  world.laserTimer += dt;
  const cycle = diff.laserOnTime + diff.laserOffTime;
  world.laserOn = (world.laserTimer % cycle) < diff.laserOnTime;

  // Guard + kamera.
  for (const g of world.guards) updateGuard(g, world, dt);
  for (const c of world.cameras) updateCamera(c, dt);

  // Deteksi: guard, kamera, atau laser.
  let seen = false;
  for (const g of world.guards) {
    if (guardSeesThief(g, t, world)) {
      seen = true;
      g.alerted = true;
    }
  }
  for (const c of world.cameras) {
    if (cameraSeesThief(c, t, world)) seen = true;
  }
  // Disguise tidak mempan ke laser; hidden (vent/cover) juga tidak mempan
  // ke laser bila thief berdiri tepat di garisnya — tapi vent jauh dari laser.
  if (thiefInLaser(world) && !t.hidden) seen = true;

  // Alarm: naik saat terlihat, turun pelan saat bersembunyi.
  if (seen) {
    world.spotted = true;
    world.spottedTimer += dt;
    // Grace ~1 detik: alarm naik pelan dulu, lalu melonjak setelah SPOTTED.
    const rate = world.spottedTimer < SPOTTED_GRACE ? diff.alarmRise * 0.35 : diff.alarmRise;
    world.alarm = Math.min(100, world.alarm + rate * dt);
    world.message = 'SPOTTED!';
  } else {
    world.spotted = false;
    world.spottedTimer = 0;
    world.alarm = Math.max(0, world.alarm - diff.alarmDecay * dt);
    if (world.message === 'SPOTTED!') world.message = '';
  }
  world.stats.peakAlarm = Math.max(world.stats.peakAlarm, Math.round(world.alarm));

  // Efek kedaluwarsa.
  world.effects = world.effects.filter((e) => world.time < e.until);

  // Loot: berlian wajib, lukisan opsional.
  const d = world.loot.diamond;
  if (!d.taken && Math.hypot(t.x - d.x, t.y - d.y) < PICKUP_RADIUS) {
    d.taken = true;
    t.hasDiamond = true;
    world.stats.lootValue += LOOT_VALUES.diamond;
    world.message = 'Berlian Gilded didapat! Kabur ke pintu darurat!';
  }
  for (const p of world.loot.paintings) {
    if (!p.taken && Math.hypot(t.x - p.x, t.y - p.y) < PICKUP_RADIUS) {
      p.taken = true;
      world.stats.lootValue += p.value;
    }
  }

  // Menang: berlian dibawa ke pintu darurat (kanan bawah).
  if (t.hasDiamond && Math.hypot(t.x - world.exit.x, t.y - world.exit.y) < EXIT_RADIUS) {
    finishRun(world, true);
    return world;
  }

  // Kalah: alarm mencapai 100.
  if (world.alarm >= 100) {
    finishRun(world, false);
    return world;
  }

  // Skor berjalan (untuk HUD).
  world.score = finalScore(world);
  return world;
}
