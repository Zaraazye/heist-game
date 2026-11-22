// The Gilded Hour — renderer.
// Menggambar ruangan museum (lantai parket, dinding, tali beludru,
// pedestal, lukisan, vault emas, pintu, ventilasi, grid laser), thief,
// guard + vision cone merah, kamera + cone berputar, loot emas, HUD yang
// padat terbaca, serta layar title (brosur fitur), caught ("SPOTTED") dan
// victory (stats + grade). Vanilla canvas 2D, tanpa library.
// Look: museum malam biru gelap, spotlight emas hangat, cone merah,
// loot emas.

import { WORLD_W, WORLD_H, COLORS, toolCost } from './config.js';
import { TOOLS } from './tools.js';
import { finalScore, gradeFor } from './world.js';

// Slot tool di HUD (kiri atas, di bawah panel judul). Diekspor supaya
// input.js bisa memetakan klik mouse ke tool yang sama persis.
export const TOOL_SLOTS = [
  { id: 'smoke', x: 16, y: 56, w: 60, h: 60 },
  { id: 'noise', x: 84, y: 56, w: 60, h: 60 },
  { id: 'disguise', x: 152, y: 56, w: 60, h: 60 },
];

export function toolAtPoint(x, y) {
  for (const s of TOOL_SLOTS) {
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return s.id;
  }
  return null;
}

const TOOL_LABEL = { smoke: 'SMOKE', noise: 'NOISE', disguise: 'DISGUISE' };
const TOOL_KEY = { smoke: '1', noise: '2', disguise: '3' };

function fmtMoney(n) {
  return '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.arcTo(x + w, y, x + w, y + rad, rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.arcTo(x + w, y + h, x + w - rad, y + h, rad);
  ctx.lineTo(x + rad, y + h);
  ctx.arcTo(x, y + h, x, y + h - rad, rad);
  ctx.lineTo(x, y + rad);
  ctx.arcTo(x, y, x + rad, y, rad);
  ctx.closePath();
}

function panel(ctx, x, y, w, h) {
  rr(ctx, x, y, w, h, 8);
  ctx.fillStyle = 'rgba(6, 10, 22, 0.78)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawCone(ctx, x, y, dir, halfAngle, range, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, dir - halfAngle, dir + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (edge) {
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawDiamond(ctx, x, y, r, glow) {
  ctx.save();
  if (glow) {
    ctx.shadowColor = '#aee9ff';
    ctx.shadowBlur = 18;
  }
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.8, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.8, y);
  ctx.closePath();
  ctx.fillStyle = '#aee9ff';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.8, y);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fillStyle = '#e6fbff';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x, y);
  ctx.lineTo(x - r * 0.8, y);
  ctx.closePath();
  ctx.fillStyle = '#6fc4e8';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- ruangan

function drawFloor(ctx) {
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  const tile = 80;
  for (let ty = 0; ty < WORLD_H / tile; ty++) {
    for (let tx = 0; tx < WORLD_W / tile; tx++) {
      if ((tx + ty) % 2 === 0) {
        ctx.fillStyle = COLORS.floorTile;
        ctx.fillRect(tx * tile, ty * tile, tile, tile);
      }
    }
  }
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= WORLD_W; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD_H);
    ctx.stroke();
  }
  for (let y = 0; y <= WORLD_H; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD_W, y);
    ctx.stroke();
  }
  // Inlay emas di tepi lantai — bingkai museum.
  ctx.strokeStyle = COLORS.goldDim;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, WORLD_W - 56, WORLD_H - 56);
  ctx.globalAlpha = 1;
}

function drawOuterWalls(ctx) {
  ctx.fillStyle = COLORS.wall;
  ctx.fillRect(0, 0, WORLD_W, 16);
  ctx.fillRect(0, WORLD_H - 16, WORLD_W, 16);
  ctx.fillRect(0, 0, 16, WORLD_H);
  ctx.fillRect(WORLD_W - 16, 0, 16, WORLD_H);
  ctx.strokeStyle = COLORS.wallEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, WORLD_W - 32, WORLD_H - 32);
}

function drawDoors(ctx, world) {
  // Pintu masuk (kiri bawah) — alas terang + label.
  const e = world.entrance;
  rr(ctx, e.x - 42, e.y - 30, 84, 60, 8);
  ctx.fillStyle = 'rgba(55, 214, 122, 0.16)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(55, 214, 122, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#9be8bd';
  ctx.font = 'bold 11px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('MASUK', e.x, e.y + 4);
  // Pintu darurat (kanan bawah) — alas hijau menyala.
  const x = world.exit;
  ctx.save();
  ctx.shadowColor = COLORS.exit;
  ctx.shadowBlur = 22;
  rr(ctx, x.x - 46, x.y - 32, 92, 64, 8);
  ctx.fillStyle = 'rgba(55, 214, 122, 0.28)';
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = COLORS.exit;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#d2ffe4';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText('EXIT', x.x, x.y + 5);
}

function drawVault(ctx, world) {
  const v = world.vault;
  ctx.save();
  ctx.shadowColor = COLORS.gold;
  ctx.shadowBlur = 26;
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 5;
  ctx.strokeRect(v.x, v.y, v.w, v.h);
  ctx.restore();
  ctx.fillStyle = '#0d1526';
  ctx.fillRect(v.x + 5, v.y + 5, v.w - 10, v.h - 10);
  ctx.strokeStyle = COLORS.goldDim;
  ctx.lineWidth = 1;
  ctx.strokeRect(v.x + 14, v.y + 14, v.w - 28, v.h - 28);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('VAULT', v.x + v.w / 2, v.y + 32);
  // Celah pintu vault di sisi bawah.
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(v.x + v.w / 2 - 26, v.y + v.h - 6, 52, 6);
}

function drawPaintings(ctx, world) {
  const art = ['#7a2e3a', '#2e5a7a', '#3a6b4a'];
  world.loot.paintings.forEach((p, i) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = COLORS.goldDim;
    ctx.fillRect(-27, -20, 54, 40);
    if (!p.taken) {
      ctx.fillStyle = art[i % art.length];
      ctx.fillRect(-23, -16, 46, 32);
      ctx.fillStyle = 'rgba(255, 233, 168, 0.35)';
      ctx.beginPath();
      ctx.arc(-8, -6, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(-23, 6, 46, 10);
    } else {
      ctx.fillStyle = '#0a0f1e';
      ctx.fillRect(-23, -16, 46, 32);
    }
    ctx.restore();
    ctx.fillStyle = COLORS.goldDim;
    ctx.font = '10px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.taken ? '' : fmtMoney(p.value), p.x, p.y + 34);
  });
}

function drawCovers(ctx, world) {
  for (const c of world.covers) {
    rr(ctx, c.x, c.y, c.w, c.h, 6);
    ctx.fillStyle = COLORS.velvet;
    ctx.globalAlpha = 0.9;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = COLORS.goldDim;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
    for (const [px, py] of [
      [c.x + 6, c.y + 6],
      [c.x + c.w - 6, c.y + 6],
      [c.x + 6, c.y + c.h - 6],
      [c.x + c.w - 6, c.y + c.h - 6],
    ]) {
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.gold;
      ctx.fill();
    }
  }
}

function drawVent(ctx, world) {
  const v = world.vent;
  ctx.fillStyle = '#0e2233';
  ctx.fillRect(v.x, v.y, v.w, v.h);
  ctx.strokeStyle = COLORS.vent;
  ctx.lineWidth = 1;
  ctx.strokeRect(v.x, v.y, v.w, v.h);
  ctx.strokeStyle = 'rgba(154, 167, 199, 0.5)';
  for (let x = v.x + 18; x < v.x + v.w - 8; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, v.y + 5);
    ctx.lineTo(x, v.y + v.h - 5);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(154, 167, 199, 0.75)';
  ctx.font = 'bold 10px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('VENTILASI', v.x + v.w / 2, v.y + v.h / 2 + 3.5);
}

function drawLasers(ctx, world) {
  for (const l of world.lasers) {
    const cx = l.x + l.w / 2;
    ctx.fillStyle = '#1a1216';
    ctx.fillRect(cx - 9, l.y - 8, 18, 12);
    ctx.fillRect(cx - 9, l.y + l.h - 4, 18, 12);
    if (world.laserOn) {
      ctx.save();
      ctx.shadowColor = COLORS.laser;
      ctx.shadowBlur = 16;
      ctx.fillStyle = 'rgba(255, 45, 85, 0.25)';
      ctx.fillRect(l.x - 3, l.y, l.w + 6, l.h);
      ctx.fillStyle = COLORS.laser;
      ctx.fillRect(cx - 2, l.y, 4, l.h);
      ctx.restore();
    } else {
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = COLORS.laserOff;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, l.y);
      ctx.lineTo(cx, l.y + l.h);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function drawWalls(ctx, world) {
  for (const w of world.walls) {
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = COLORS.wallEdge;
    ctx.fillRect(w.x, w.y, w.w, 3);
    ctx.fillRect(w.x, w.y, 3, w.h);
  }
}

function drawRoom(ctx, world) {
  drawFloor(ctx);
  drawVent(ctx, world);
  drawCovers(ctx, world);
  drawLasers(ctx, world);
  drawDoors(ctx, world);
  drawVault(ctx, world);
  drawPaintings(ctx, world);
  drawWalls(ctx, world);
  drawOuterWalls(ctx);
}

// ---------------------------------------------------------------- entitas

function drawGuard(ctx, g, time) {
  const blind = time < (g.blindUntil || 0);
  const fill = blind ? 'rgba(120, 130, 160, 0.13)' : g.alerted ? 'rgba(255, 59, 48, 0.38)' : COLORS.coneSoft;
  const edge = blind ? 'rgba(120, 130, 160, 0.4)' : 'rgba(255, 59, 48, 0.55)';
  drawCone(ctx, g.x, g.y, g.dir, g.coneAngle / 2, g.coneRange, fill, edge);
}

function drawGuardBody(ctx, g, time) {
  const blind = time < (g.blindUntil || 0);
  ctx.beginPath();
  ctx.arc(g.x, g.y, 13, 0, Math.PI * 2);
  ctx.fillStyle = blind ? '#5a6a8a' : COLORS.guard;
  ctx.fill();
  ctx.strokeStyle = '#0a0f1e';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  ctx.lineTo(g.x + Math.cos(g.dir) * 20, g.y + Math.sin(g.dir) * 20);
  ctx.strokeStyle = '#0a0f1e';
  ctx.lineWidth = 3;
  ctx.stroke();
  if (g.alerted && !blind) {
    ctx.fillStyle = '#ff3b30';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', g.x, g.y - 20);
  } else if (blind) {
    ctx.fillStyle = '#c8d2e8';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('×', g.x, g.y - 19);
  }
}

function drawCamera(ctx, cam) {
  drawCone(ctx, cam.x, cam.y, cam.angle, cam.coneAngle / 2, cam.coneRange, 'rgba(255, 59, 48, 0.16)', 'rgba(255, 59, 48, 0.4)');
  ctx.fillStyle = '#1c2438';
  ctx.fillRect(cam.x - 9, cam.y - 9, 18, 18);
  ctx.strokeStyle = COLORS.camera;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cam.x - 9, cam.y - 9, 18, 18);
  ctx.beginPath();
  ctx.arc(cam.x, cam.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.camera;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cam.x + Math.cos(cam.angle) * 3, cam.y + Math.sin(cam.angle) * 3, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ff3b30';
  ctx.fill();
}

function drawThief(ctx, world) {
  const t = world.thief;
  const time = world.time || 0;
  ctx.save();
  if (t.hidden) ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.ellipse(t.x, t.y + 12, 13, 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(t.x, t.y, 14, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.thief;
  ctx.fill();
  ctx.strokeStyle = '#0a0f1e';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  const px = Math.cos(t.dir + Math.PI / 2);
  const py = Math.sin(t.dir + Math.PI / 2);
  const fx = Math.cos(t.dir);
  const fy = Math.sin(t.dir);
  ctx.fillStyle = '#0a0f1e';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(t.x + fx * 5 + px * 5 * s, t.y + fy * 5 + py * 5 * s, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(t.x + fx * 10, t.y + fy * 10);
  ctx.lineTo(t.x + fx * 19, t.y + fy * 19);
  ctx.strokeStyle = '#0a0f1e';
  ctx.lineWidth = 3;
  ctx.stroke();
  if (t.disguisedUntil && time < t.disguisedUntil) {
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(t.x, t.y, 21, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (t.hidden) {
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(t.x, t.y, 21, 0, Math.PI * 2);
    ctx.strokeStyle = '#7fb2ff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
  if (t.hasDiamond) {
    const bob = Math.sin(time * 3) * 2;
    drawDiamond(ctx, t.x + 17, t.y - 18 + bob, 7, true);
  }
}

function drawEffects(ctx, world) {
  const time = world.time || 0;
  for (const e of world.effects) {
    if (time >= e.until) continue;
    if (e.type === 'smoke') {
      const g = ctx.createRadialGradient(e.x, e.y, 10, e.x, e.y, e.radius);
      g.addColorStop(0, 'rgba(200, 205, 215, 0.55)');
      g.addColorStop(1, 'rgba(200, 205, 215, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'noise') {
      const left = e.until - time;
      const r = 26 + (1.2 - left) * 34;
      ctx.beginPath();
      ctx.arc(e.x, e.y, Math.max(8, r), 0, Math.PI * 2);
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }
}

function drawLootDiamond(ctx, world) {
  const d = world.loot.diamond;
  if (d.taken) {
    ctx.beginPath();
    ctx.arc(d.x, d.y, 12, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.goldDim;
    ctx.lineWidth = 2;
    ctx.stroke();
    return;
  }
  const pulse = 1 + Math.sin((world.time || 0) * 3) * 0.08;
  drawDiamond(ctx, d.x, d.y, 17 * pulse, true);
}

// ---------------------------------------------------------------- HUD

function drawToolGlyph(ctx, id, cx, cy, dim) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = dim ? '#5a6a8a' : COLORS.gold;
  ctx.fillStyle = dim ? '#5a6a8a' : COLORS.gold;
  ctx.lineWidth = 2;
  if (id === 'smoke') {
    ctx.beginPath();
    ctx.arc(-7, 3, 7, 0, Math.PI * 2);
    ctx.arc(0, -3, 8, 0, Math.PI * 2);
    ctx.arc(8, 3, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'noise') {
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    for (const r of [9, 14]) {
      ctx.beginPath();
      ctx.arc(0, 0, r, -Math.PI / 3, Math.PI / 3);
      ctx.stroke();
    }
  } else {
    rr(ctx, -11, -7, 22, 14, 6);
    ctx.fill();
    ctx.fillStyle = '#0a0f1e';
    ctx.beginPath();
    ctx.arc(-5, 0, 2.4, 0, Math.PI * 2);
    ctx.arc(5, 0, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawHUD(ctx, world, selectedTool) {
  const time = world.time || 0;
  // Panel kiri atas: judul + difficulty.
  panel(ctx, 12, 10, 278, 36);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('THE GILDED HOUR', 24, 33);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '11px Georgia, serif';
  ctx.textAlign = 'right';
  ctx.fillText((world.difficulty || 'professional').toUpperCase(), 278, 33);
  // Panel kanan atas: loot + waktu + skor.
  panel(ctx, 940, 10, 328, 36);
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 14px Georgia, serif';
  ctx.fillText('LOOT ' + fmtMoney(world.stats.lootValue || 0), 954, 33);
  ctx.fillStyle = COLORS.text;
  ctx.font = '13px Georgia, serif';
  ctx.fillText(fmtTime(time), 1085, 33);
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText('SKOR ' + fmtMoney(world.score || 0), 1150, 33);
  // Slot tool.
  for (const s of TOOL_SLOTS) {
    const left = world.tools[s.id] || 0;
    rr(ctx, s.x, s.y, s.w, s.h, 8);
    ctx.fillStyle = 'rgba(6, 10, 22, 0.78)';
    ctx.fill();
    ctx.strokeStyle = left <= 0 ? 'rgba(120, 130, 160, 0.4)' : 'rgba(212, 175, 55, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    drawToolGlyph(ctx, s.id, s.x + s.w / 2, s.y + s.h / 2 - 2, left <= 0);
    ctx.fillStyle = COLORS.textDim;
    ctx.font = 'bold 10px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(TOOL_KEY[s.id], s.x + 6, s.y + 13);
    ctx.textAlign = 'right';
    ctx.fillStyle = left <= 0 ? '#ff6b61' : COLORS.gold;
    ctx.font = 'bold 12px Georgia, serif';
    ctx.fillText(left <= 0 ? '×0' : '×' + left, s.x + s.w - 6, s.y + s.h - 7);
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '9px Georgia, serif';
    ctx.fillText('-' + toolCost(s.id, world.difficulty), s.x + 6, s.y + s.h - 7);
  }
  // Slot terpilih digambar ulang dengan bingkai emas (di atas slot lain).
  const sel = TOOL_SLOTS.find((s) => s.id === selectedTool);
  if (sel) {
    rr(ctx, sel.x, sel.y, sel.w, sel.h, 8);
    ctx.strokeStyle = COLORS.goldBright;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  // Nama tool terpilih + deskripsi singkat.
  const desc = TOOLS[selectedTool];
  if (desc) {
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '12px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(TOOL_LABEL[selectedTool] + ' — ' + desc.desc, 16, 132);
  }
  // Alarm — panel bawah tengah.
  panel(ctx, 470, 664, 340, 42);
  ctx.fillStyle = world.alarm >= 75 ? '#ff6b61' : COLORS.text;
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', 484, 690);
  const bx = 548;
  const bw = 180;
  ctx.fillStyle = '#0a0f1e';
  ctx.fillRect(bx, 674, bw, 14);
  const frac = Math.max(0, Math.min(1, (world.alarm || 0) / 100));
  ctx.fillStyle = world.alarm >= 75 ? '#ff3b30' : world.alarm >= 50 ? '#ff9f2e' : '#37d67a';
  ctx.fillRect(bx, 674, bw * frac, 14);
  ctx.strokeStyle = 'rgba(238, 242, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx, 674, bw, 14);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(Math.round(world.alarm || 0) + '%', 736, 690);
  // Baris pesan / objektif — bawah tengah, di atas panel alarm.
  const msg = world.message || '';
  ctx.font = '15px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(6, 10, 22, 0.7)';
  const mw = ctx.measureText(msg || 'Curi Berlian Gilded, lalu kabur lewat pintu darurat!').width;
  ctx.fillRect(640 - mw / 2 - 10, 632, mw + 20, 24);
  ctx.fillStyle = msg === 'SPOTTED!' ? '#ff6b61' : COLORS.text;
  ctx.fillText(msg || 'Curi Berlian Gilded, lalu kabur lewat pintu darurat!', 640, 649);
  // Peringatan SPOTTED besar di tengah layar.
  if (world.spotted) {
    ctx.save();
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(time * 6);
    ctx.fillStyle = '#ff3b30';
    ctx.font = 'bold 52px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('SPOTTED!', 640, 300);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- layar

function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(4, 7, 16, 0.78)';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  panel(ctx, 290, 76, 700, 568);
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2;
  rr(ctx, 290, 76, 700, 568, 8);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 54px Georgia, serif';
  ctx.fillText('THE GILDED HOUR', 640, 150);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = 'italic 17px Georgia, serif';
  ctx.fillText('Museum heist — satu ruangan, satu berlian, satu jalan kabur.', 640, 182);
  ctx.strokeStyle = COLORS.goldDim;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(390, 202);
  ctx.lineTo(890, 202);
  ctx.stroke();
  const feats = [
    '3 RUTE — aula utama · ventilasi · grid laser',
    '3 TOOL — smoke bomb · noise-maker · disguise (1x pakai)',
    '2 GUARD patrol + 2 KAMERA — baca cone-nya sebelum bergerak',
    '3 DIFFICULTY — Casual · Professional · Ghost',
    'ENDLESS — setelah vault, lukisan terus bisa dijarah',
    'GRADE S / A / B / C — dari loot, waktu & alarm puncak',
  ];
  ctx.fillStyle = COLORS.text;
  ctx.font = '17px Georgia, serif';
  feats.forEach((f, i) => ctx.fillText(f, 640, 238 + i * 30));
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '14px Georgia, serif';
  ctx.fillText('WASD / Panah gerak  ·  Space pakai tool  ·  1/2/3 pilih tool  ·  Shift jalan pelan', 640, 446);
  const diffs = [
    ['1', 'CASUAL'],
    ['2', 'PROFESSIONAL'],
    ['3', 'GHOST'],
  ];
  diffs.forEach(([key, label], i) => {
    const x = 490 + i * 100;
    const active = (world.difficulty || 'professional') === label.toLowerCase();
    rr(ctx, x, 470, 92, 34, 6);
    ctx.fillStyle = active ? COLORS.gold : 'rgba(6, 10, 22, 0.6)';
    ctx.fill();
    ctx.strokeStyle = active ? COLORS.goldBright : 'rgba(154, 167, 199, 0.5)';
    ctx.lineWidth = active ? 2 : 1;
    ctx.stroke();
    ctx.fillStyle = active ? '#0a0f1e' : COLORS.text;
    ctx.font = 'bold 12px Georgia, serif';
    ctx.fillText(key + ' ' + label, x + 46, 491);
  });
  ctx.save();
  ctx.globalAlpha = 0.7 + 0.3 * Math.sin((world.time || 0) * 3 + 1);
  ctx.fillStyle = COLORS.goldBright;
  ctx.font = 'bold 21px Georgia, serif';
  ctx.fillText('TEKAN ENTER UNTUK MULAI', 640, 566);
  ctx.restore();
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '12px Georgia, serif';
  ctx.fillText('Klik juga bisa. Alarm 100 berarti tertangkap — bersembunyi di tali beludru & ventilasi.', 640, 606);
}

function drawStatsRows(ctx, world, y0) {
  const rows = [
    ['LOOT', fmtMoney(world.stats.lootValue || 0)],
    ['WAKTU', fmtTime(world.stats.time || world.time || 0)],
    ['ALARM PUNCAK', Math.round(world.stats.peakAlarm || 0) + '%'],
    ['TOOL DIPAKAI', String(world.stats.toolsUsed || 0)],
    ['SKOR AKHIR', fmtMoney(world.stats.finalScore ?? finalScore(world))],
  ];
  ctx.font = '17px Georgia, serif';
  rows.forEach(([label, value], i) => {
    const y = y0 + i * 32;
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText(label, 480, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(value, 800, y);
  });
}

function drawEnd(ctx, world, won) {
  ctx.fillStyle = won ? 'rgba(60, 45, 0, 0.45)' : 'rgba(60, 0, 0, 0.5)';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  panel(ctx, 340, 110, 600, 500);
  ctx.strokeStyle = won ? COLORS.gold : '#ff3b30';
  ctx.lineWidth = 2;
  rr(ctx, 340, 110, 600, 500, 8);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? COLORS.gold : '#ff3b30';
  ctx.font = 'bold 58px Georgia, serif';
  ctx.fillText(won ? 'KABUR!' : 'SPOTTED', 640, 190);
  ctx.fillStyle = COLORS.text;
  ctx.font = '18px Georgia, serif';
  ctx.fillText(
    won ? 'Berlian Gilded aman. Pintu darurat tertembus.' : 'Alarm penuh — guard menangkapmu di galeri.',
    640,
    226,
  );
  drawStatsRows(ctx, world, 286);
  const grade = world.stats.grade || gradeFor(world);
  ctx.fillStyle = grade === 'S' ? COLORS.goldBright : grade === 'A' ? '#37d67a' : grade === 'B' ? '#7fb2ff' : '#9aa7c7';
  ctx.font = 'bold 84px Georgia, serif';
  ctx.fillText('GRADE ' + grade, 640, 520);
  ctx.save();
  ctx.globalAlpha = 0.7 + 0.3 * Math.sin((world.time || 0) * 3 + 1);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = 'bold 16px Georgia, serif';
  ctx.fillText('Tekan R untuk main lagi', 640, 576);
  ctx.restore();
}

// ---------------------------------------------------------------- utama

export function render(ctx, world, selectedTool = 'smoke') {
  ctx.clearRect(0, 0, WORLD_W, WORLD_H);
  drawRoom(ctx, world);
  // Cone guard + kamera (di bawah asap & badan).
  for (const g of world.guards) drawGuard(ctx, g, world.time || 0);
  for (const c of world.cameras) drawCamera(ctx, c);
  drawEffects(ctx, world);
  drawLootDiamond(ctx, world);
  for (const g of world.guards) drawGuardBody(ctx, g, world.time || 0);
  drawThief(ctx, world);
  if (world.state === 'play' || world.state === 'caught' || world.state === 'victory') {
    drawHUD(ctx, world, selectedTool);
  }
  if (world.state === 'title') {
    drawTitle(ctx, world);
  } else if (world.state === 'caught') {
    drawEnd(ctx, world, false);
  } else if (world.state === 'victory') {
    drawEnd(ctx, world, true);
  }
}
