// Penjaga museum: patrol waypoint, cone pandang menyapu,
// dan tes "apakah thief terlihat".

import { difficultySettings } from './config.js';

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Apakah segmen (x1,y1)-(x2,y2) memotong rect? Dipakai untuk garis pandang.
export function segmentHitsRect(x1, y1, x2, y2, r) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  if (maxX < r.x || minX > r.x + r.w || maxY < r.y || minY > r.y + r.h) return false;
  // Titik ujung di dalam rect
  if (x1 >= r.x && x1 <= r.x + r.w && y1 >= r.y && y1 <= r.y + r.h) return true;
  if (x2 >= r.x && x2 <= r.x + r.w && y2 >= r.y && y2 <= r.y + r.h) return true;
  // Uji potong tiap sisi rect (parametrik)
  const dx = x2 - x1;
  const dy = y2 - y1;
  const sides = [
    [r.x, r.y, r.x + r.w, r.y],
    [r.x + r.w, r.y, r.x + r.w, r.y + r.h],
    [r.x + r.w, r.y + r.h, r.x, r.y + r.h],
    [r.x, r.y + r.h, r.x, r.y],
  ];
  for (const [sx1, sy1, sx2, sy2] of sides) {
    const sdx = sx2 - sx1;
    const sdy = sy2 - sy1;
    const denom = dx * sdy - dy * sdx;
    if (denom === 0) continue;
    const t = ((sx1 - x1) * sdy - (sy1 - y1) * sdx) / denom;
    const u = ((sx1 - x1) * dy - (sy1 - y1) * dx) / denom;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return true;
  }
  return false;
}

export function lineBlocked(x1, y1, x2, y2, walls) {
  if (!walls) return false;
  for (const w of walls) {
    if (segmentHitsRect(x1, y1, x2, y2, w)) return true;
  }
  return false;
}

export function createGuard(waypoints, opts = {}) {
  const diff = difficultySettings(opts.difficulty || 'professional');
  const start = waypoints && waypoints[0] ? waypoints[0] : { x: 640, y: 360 };
  return {
    x: start.x,
    y: start.y,
    dir: opts.dir ?? -Math.PI / 2,
    waypoints: (waypoints || [{ x: 640, y: 360 }]).map((p) => ({ x: p.x, y: p.y })),
    wpIndex: 1 % Math.max(1, (waypoints || [start]).length),
    speed: opts.speed ?? diff.guardSpeed,
    coneAngle: opts.coneAngle ?? diff.guardConeAngle,
    coneRange: opts.coneRange ?? diff.guardConeRange,
    alerted: false,
    pauseTimer: 0,
    investigate: null, // {x, y} titik yang dipancing noise tool
    blindUntil: 0,
    difficulty: opts.difficulty || 'professional',
  };
}

export function updateGuard(guard, world, dt) {
  if (!guard || !world || dt <= 0) return;
  const now = world.time || 0;

  // Buta oleh smoke: berdiri diam, cone tidak aktif (dicek di guardSeesThief).
  if (now < (guard.blindUntil || 0)) {
    guard.alerted = false;
    return;
  }

  // Target: titik investigasi (noise) lebih prioritas dari patrol.
  let target = null;
  let speed = guard.speed;
  if (guard.investigate) {
    target = guard.investigate;
    speed = guard.speed * 1.5;
    guard.alerted = true;
  } else if (guard.waypoints && guard.waypoints.length > 0) {
    target = guard.waypoints[guard.wpIndex % guard.waypoints.length];
  }
  if (!target) return;

  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 8) {
    if (guard.investigate) {
      // Sampai di titik pancingan: lihat sekeliling sebentar, lalu kembali patrol.
      guard.investigate = null;
      guard.alerted = false;
      guard.pauseTimer = 1.2;
    } else {
      guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
      guard.pauseTimer = 0.9; // jeda singkat di tiap waypoint, cone menyapu
    }
    return;
  }

  if (guard.pauseTimer > 0) {
    guard.pauseTimer -= dt;
    // Saat jeda, cone menyapu perlahan (putar arah pandang).
    guard.dir += Math.sin(now * 1.4) * 0.9 * dt;
    return;
  }

  const step = speed * dt;
  const move = Math.min(step, dist);
  guard.x += (dx / dist) * move;
  guard.y += (dy / dist) * move;
  guard.dir = Math.atan2(dy, dx);
}

export function guardSeesThief(guard, thief, world) {
  if (!guard || !thief || !world) return false;
  const now = world.time || 0;
  if (now < (guard.blindUntil || 0)) return false;
  if (thief.hidden) return false;
  if (thief.disguisedUntil && now < thief.disguisedUntil) return false;

  const dx = thief.x - guard.x;
  const dy = thief.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > guard.coneRange) return false;
  if (dist < 26) return true; // terlalu dekat: ketahuan walau di tepi cone
  const angleTo = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(angleTo, guard.dir)) > guard.coneAngle / 2) return false;
  if (world.walls && lineBlocked(guard.x, guard.y, thief.x, thief.y, world.walls)) return false;
  return true;
}
