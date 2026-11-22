// The Gilded Hour — game loop & state machine.
// title -> play -> caught / victory. Membaca ?shot=<nama>&seed=<n> untuk
// staging screenshot deterministik (satu frame, tanpa loop), atau jalan
// interaktif: input -> updateWorld -> render tiap frame.
// Vanilla JS, ES module, tanpa library, tanpa network.

import { createWorld, updateWorld } from './world.js';
import { createInput } from './input.js';
import { render } from './render.js';
import { stageShot } from './shots.js';
import { THIEF_SPEED } from './config.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || 1) || 1;

if (shot) {
  // Mode screenshot: stage satu frame deterministik, render sekali.
  const world = createWorld('professional', seed);
  stageShot(world, shot);
  render(ctx, world);
} else {
  // Mode main: loop requestAnimationFrame.
  const input = createInput(canvas);
  let world = createWorld('professional', 1337);
  let last = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;

    // Ganti difficulty di title screen (1/2/3).
    if (world.state === 'title') {
      const pick = [
        ['Digit1', 'casual'],
        ['Digit2', 'professional'],
        ['Digit3', 'ghost'],
      ].find(([code]) => input.wasPressed(code));
      if (pick) {
        world = createWorld(pick[1], 1337);
        input.selectedTool = 'smoke';
      }
    }

    const f = {};
    let mx = 0;
    let my = 0;
    if (input.keys.up) my -= 1;
    if (input.keys.down) my += 1;
    if (input.keys.left) mx -= 1;
    if (input.keys.right) mx += 1;
    if (mx !== 0 || my !== 0) f.move = { x: mx, y: my };

    // Shift = jalan pelan (kecepatan thief diturunkan selama Shift ditekan).
    world.thief.speed = input.keys.shift ? THIEF_SPEED * 0.45 : THIEF_SPEED;

    // Mulai dari title (Enter / Space / klik).
    if (world.state === 'title' && (input.wasPressed('Enter') || input.wasPressed('Space') || input.mouse.clicked)) {
      f.start = true;
    }

    // Pakai tool terpilih (Space). Noise dilempar ke posisi mouse,
    // smoke & disguise dipakai di posisi thief.
    if (world.state === 'play' && input.wasPressed('Space')) {
      f.useTool = input.selectedTool;
      if (input.selectedTool === 'noise') {
        f.toolX = input.mouse.x;
        f.toolY = input.mouse.y;
      } else {
        f.toolX = world.thief.x;
        f.toolY = world.thief.y;
      }
    }

    // Ulang dari layar akhir (R / Enter) — run baru langsung jalan.
    if ((world.state === 'caught' || world.state === 'victory') && (input.wasPressed('KeyR') || input.wasPressed('Enter'))) {
      world = createWorld(world.difficulty, (Math.random() * 1e9) | 0);
      world.state = 'play';
    }

    updateWorld(world, f, dt);
    render(ctx, world, input.selectedTool);
    input.endFrame();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
