// Kamera CCTV: terpasang di dinding/langit-langit, cone berputar
// ping-pong (sinus) mengawasi satu area.

import { difficultySettings } from './config.js';

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function createCamera(x, y, baseAngle, opts = {}) {
  const diff = difficultySettings(opts.difficulty || 'professional');
  return {
    x,
    y,
    angle: baseAngle,
    baseAngle,
    sweepSpeed: opts.sweepSpeed ?? 0.55,
    sweepRange: opts.sweepRange ?? 0.7, // radian simpangan dari baseAngle
    coneAngle: opts.coneAngle ?? diff.cameraConeAngle,
    coneRange: opts.coneRange ?? diff.cameraConeRange,
    phase: opts.phase ?? 0,
    difficulty: opts.difficulty || 'professional',
  };
}

export function updateCamera(cam, dt) {
  if (!cam || dt <= 0) return;
  cam.phase = (cam.phase || 0) + dt * (cam.sweepSpeed || 0.55);
  // Ping-pong halus: sinus di sekitar baseAngle.
  cam.angle = cam.baseAngle + Math.sin(cam.phase) * (cam.sweepRange ?? 0.7);
}

export function cameraSeesThief(cam, thief, world) {
  if (!cam || !thief) return false;
  if (thief.hidden) return false;
  if (world && thief.disguisedUntil && (world.time || 0) < thief.disguisedUntil) return false;
  // Smoke membutakan kamera juga bila kamera berada dalam asap.
  if (world && world.effects) {
    const now = world.time || 0;
    for (const e of world.effects) {
      if (e.type === 'smoke' && now < e.until && Math.hypot(cam.x - e.x, cam.y - e.y) < e.radius) {
        return false;
      }
    }
  }
  const dx = thief.x - cam.x;
  const dy = thief.y - cam.y;
  const dist = Math.hypot(dx, dy);
  if (dist > cam.coneRange) return false;
  const angleTo = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(angleTo, cam.angle)) > cam.coneAngle / 2) return false;
  return true;
}
