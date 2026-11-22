// The Gilded Hour — hand-in program.
//
// Copies the playable game (game/) and its screenshots (screenshots/) into
// the output directory, then writes dossier.json there with the make.fun kit
// library (vendor/makefun-game.ts). Node 22 standard library only; no build
// step, no install, no network.
//
//   MAKEFUN_OUTPUT_DIR=out node main.ts
//
// With no MAKEFUN_OUTPUT_DIR the output goes to /output.

import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The bounty gate's caps: text and screenshots shape the dossier, the game
// caps refuse an entry past them (same numbers the scorer passes).
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

mkdirSync(outDir, { recursive: true });
for (const name of ['game', 'screenshots']) {
  cpSync(join(here, name), join(outDir, name), { recursive: true });
}

const dossier = buildDossier(outDir, CAPS);
writeFileSync(join(outDir, 'dossier.json'), dossier);

console.log(`dossier.json: ${dossier.length} bytes -> ${join(outDir, 'dossier.json')}`);
