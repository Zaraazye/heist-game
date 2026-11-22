// The Gilded Hour — input.
// Keyboard (WASD/panah gerak, Space pakai tool, Shift jalan pelan,
// 1/2/3 pilih tool, Enter mulai, R ulang) + mouse (klik pilih tool di HUD,
// posisi mouse dipakai sebagai target tool noise).
// Mengembalikan { keys, mouse, selectedTool } plus helper wasPressed /
// endFrame / destroy. wasPressed() benar sekali per tekanan tombol
// (bukan per frame), jadi Space tidak memakai tool berulang kali.

import { toolAtPoint } from './render.js';

export function createInput(canvas) {
  const keys = { up: false, down: false, left: false, right: false, shift: false, space: false };
  const mouse = { x: 0, y: 0, down: false, clicked: false };
  const pressed = new Set();

  const api = {
    keys,
    mouse,
    selectedTool: 'smoke',
    wasPressed(code) {
      return pressed.has(code);
    },
    endFrame() {
      pressed.clear();
      mouse.clicked = false;
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
    },
  };

  function toCanvas(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * canvas.width) / r.width,
      y: ((e.clientY - r.top) * canvas.height) / r.height,
    };
  }

  function onKeyDown(e) {
    const c = e.code;
    if (c === 'ArrowUp' || c === 'ArrowDown' || c === 'ArrowLeft' || c === 'ArrowRight' || c === 'Space') {
      e.preventDefault();
    }
    switch (c) {
      case 'KeyW':
      case 'ArrowUp':
        keys.up = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        keys.down = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        keys.right = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        keys.shift = true;
        break;
      case 'Space':
        keys.space = true;
        break;
      case 'Digit1':
        api.selectedTool = 'smoke';
        break;
      case 'Digit2':
        api.selectedTool = 'noise';
        break;
      case 'Digit3':
        api.selectedTool = 'disguise';
        break;
      default:
        break;
    }
    if (!e.repeat) pressed.add(c);
  }

  function onKeyUp(e) {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        keys.up = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        keys.down = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        keys.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        keys.shift = false;
        break;
      case 'Space':
        keys.space = false;
        break;
      default:
        break;
    }
  }

  function onMouseMove(e) {
    const p = toCanvas(e);
    mouse.x = p.x;
    mouse.y = p.y;
  }

  function onMouseDown(e) {
    const p = toCanvas(e);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.down = true;
    mouse.clicked = true;
    const tool = toolAtPoint(p.x, p.y);
    if (tool) api.selectedTool = tool;
  }

  function onMouseUp() {
    mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  return api;
}
