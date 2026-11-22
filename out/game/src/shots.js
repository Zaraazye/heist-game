// The Gilded Hour — staging screenshot.
// Menyiapkan satu world yang sudah jadi ke momen deterministik per scene,
// supaya ?shot=<nama>&seed=<n> selalu merender frame yang sama.
// Dipakai main.js saat ada parameter ?shot= di URL (fase screenshot).
// Tidak ada RNG di sini: semua posisi & angka ditulis eksplisit.

import { finalScore, gradeFor } from './world.js';

function face(from, tx, ty) {
  return Math.atan2(ty - from.y, tx - from.x);
}

export function stageShot(world, shotName) {
  if (!world) return world;

  if (shotName === 'title') {
    world.state = 'title';
    world.time = 0;
    world.alarm = 0;
    return world;
  }

  if (shotName === 'caught') {
    world.state = 'caught';
    world.time = 88;
    world.alarm = 100;
    world.spotted = true;
    world.spottedTimer = 1.2;
    world.laserOn = true;
    world.laserTimer = 0.5;
    world.thief.x = 700;
    world.thief.y = 300;
    world.thief.dir = Math.PI;
    world.thief.hasDiamond = false;
    world.loot.diamond.taken = false;
    world.loot.paintings[0].taken = true;
    world.loot.paintings[1].taken = false;
    world.loot.paintings[2].taken = false;
    world.tools = { smoke: 0, noise: 1, disguise: 1 };
    world.stats = { lootValue: 800, toolsUsed: 1, peakAlarm: 100, time: 88 };
    world.toolCostSpent = 100;
    world.score = finalScore(world);
    world.stats.grade = gradeFor(world);
    world.stats.finalScore = world.score;
    world.message = `TERTANGKAP! Alarm 100. Skor ${world.score} — Grade ${world.stats.grade}`;
    const g0 = world.guards[0];
    g0.x = 640;
    g0.y = 300;
    g0.dir = face(g0, world.thief.x, world.thief.y);
    g0.alerted = true;
    const g1 = world.guards[1];
    g1.x = 950;
    g1.y = 420;
    g1.dir = face(g1, world.thief.x, world.thief.y);
    g1.alerted = false;
    world.cameras[0].angle = Math.PI / 2;
    world.cameras[1].angle = Math.PI - 0.35;
    return world;
  }

  if (shotName === 'victory') {
    world.state = 'victory';
    world.time = 118;
    world.alarm = 12;
    world.spotted = false;
    world.laserOn = false;
    world.laserTimer = 2.2;
    world.thief.x = world.exit.x;
    world.thief.y = world.exit.y;
    world.thief.dir = 0;
    world.thief.hasDiamond = true;
    world.loot.diamond.taken = true;
    for (const p of world.loot.paintings) p.taken = true;
    world.tools = { smoke: 1, noise: 1, disguise: 1 };
    world.stats = { lootValue: 7400, toolsUsed: 0, peakAlarm: 12, time: 118 };
    world.toolCostSpent = 0;
    world.score = finalScore(world);
    world.stats.grade = gradeFor(world);
    world.stats.finalScore = world.score;
    world.message = `KABUR! Berlian Gilded aman. Skor ${world.score} — Grade ${world.stats.grade}`;
    const g0 = world.guards[0];
    g0.x = 350;
    g0.y = 200;
    g0.dir = -Math.PI / 2;
    g0.alerted = false;
    const g1 = world.guards[1];
    g1.x = 1150;
    g1.y = 260;
    g1.dir = Math.PI;
    g1.alerted = false;
    world.cameras[0].angle = Math.PI / 2 + 0.6;
    world.cameras[1].angle = Math.PI + 0.4;
    return world;
  }

  // 'cover' (dan nama tak dikenal): momen tersibuk — thief di tengah
  // menyeberang, 2 guard + cone, kamera cone, vault menyala, alarm ~40,
  // HUD penuh. Ini frame paling penting.
  world.state = 'play';
  world.time = 75;
  world.alarm = 40;
  world.spotted = false;
  world.spottedTimer = 0;
  world.laserOn = true;
  world.laserTimer = 0.5;
  world.thief.x = 640;
  world.thief.y = 360;
  world.thief.dir = -Math.PI / 4;
  world.thief.hasDiamond = false;
  world.thief.disguisedUntil = 0;
  world.thief.hidden = false;
  world.loot.diamond.taken = false;
  world.loot.paintings[0].taken = false;
  world.loot.paintings[1].taken = true;
  world.loot.paintings[2].taken = false;
  world.tools = { smoke: 1, noise: 1, disguise: 1 };
  world.effects = [];
  world.stats = { lootValue: 800, toolsUsed: 0, peakAlarm: 40, time: 75 };
  world.toolCostSpent = 0;
  world.score = finalScore(world);
  world.message = '';
  const g0 = world.guards[0];
  g0.x = 480;
  g0.y = 280;
  g0.dir = face(g0, world.thief.x, world.thief.y);
  g0.alerted = false;
  g0.blindUntil = 0;
  const g1 = world.guards[1];
  g1.x = 980;
  g1.y = 420;
  g1.dir = face(g1, world.thief.x, world.thief.y);
  g1.alerted = false;
  g1.blindUntil = 0;
  world.cameras[0].angle = Math.PI / 2;
  world.cameras[1].angle = Math.PI - 0.35;
  return world;
}
