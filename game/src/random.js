// RNG deterministik (mulberry32) — run yang sama, seed yang sama,
// hasil yang sama. Dipakai untuk variasi kecil layout & patrol.

export function createRng(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function range(min, max) {
    return min + next() * (max - min);
  }
  function pick(arr) {
    if (!arr || arr.length === 0) return undefined;
    return arr[Math.floor(next() * arr.length)];
  }
  function int(min, max) {
    return Math.floor(range(min, max + 1));
  }
  function shuffle(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(next() * (i + 1));
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }
  return { next, range, pick, int, shuffle };
}
