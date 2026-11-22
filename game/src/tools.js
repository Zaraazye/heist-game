// Tiga tool pencuri — masing-masing 1 pakai per run, ada biaya skor.
// smoke: butakan cone dalam radius sebentar.
// noise: pancing guard terdekat ke satu titik.
// disguise: jalan menembus satu cone sebentar (tidak mempan ke laser).

import { toolCost } from './config.js';

export const TOOLS = {
  smoke: {
    cost: 150,
    desc: 'Asap: butakan guard & kamera dalam radius 140 selama 6 detik.',
    radius: 140,
    duration: 6,
  },
  noise: {
    cost: 100,
    desc: 'Pengalih suara: pancing guard terdekat ke titik yang dipilih.',
    radius: 0,
    duration: 0,
  },
  disguise: {
    cost: 200,
    desc: 'Penyamaran: lewati cone guard/kamera selama 5 detik.',
    radius: 0,
    duration: 5,
  },
};

export function useTool(world, toolId, x, y) {
  if (!world || !TOOLS[toolId]) return false;
  if (!world.tools || (world.tools[toolId] || 0) <= 0) return false;
  if (world.state !== 'play') return false;

  const now = world.time || 0;
  world.tools[toolId] -= 1;
  world.stats.toolsUsed = (world.stats.toolsUsed || 0) + 1;
  const cost = toolCost(toolId, world.difficulty);
  world.toolCostSpent = (world.toolCostSpent || 0) + cost;

  if (toolId === 'smoke') {
    const cx = x ?? world.thief.x;
    const cy = y ?? world.thief.y;
    world.effects.push({
      type: 'smoke',
      x: cx,
      y: cy,
      radius: TOOLS.smoke.radius,
      until: now + TOOLS.smoke.duration,
    });
    // Guard yang berdiri di dalam asap langsung buta selama durasi asap.
    for (const g of world.guards) {
      if (Math.hypot(g.x - cx, g.y - cy) < TOOLS.smoke.radius) {
        g.blindUntil = now + TOOLS.smoke.duration;
      }
    }
  } else if (toolId === 'noise') {
    const tx = x ?? world.thief.x;
    const ty = y ?? world.thief.y;
    // Guard terdekat dari titik suara yang dipancing ke sana.
    let nearest = null;
    let best = Infinity;
    for (const g of world.guards) {
      const d = Math.hypot(g.x - tx, g.y - ty);
      if (d < best) {
        best = d;
        nearest = g;
      }
    }
    if (nearest) {
      nearest.investigate = { x: tx, y: ty };
      nearest.alerted = true;
      nearest.pauseTimer = 0;
    }
    world.effects.push({ type: 'noise', x: tx, y: ty, radius: 26, until: now + 1.2 });
  } else if (toolId === 'disguise') {
    world.thief.disguisedUntil = now + TOOLS.disguise.duration;
    world.effects.push({
      type: 'disguise',
      x: world.thief.x,
      y: world.thief.y,
      radius: 0,
      until: now + TOOLS.disguise.duration,
    });
  }
  return true;
}
