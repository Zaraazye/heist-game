# The Gilded Hour

[![make.fun bounty](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Zaraazye/heist-game/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Zaraazye/heist-game/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

Satu ruangan museum besar, top-down. Seorang pencuri masuk dari pintu,
menyeberang ke vault, mengambil Berlian Gilded, lalu kabur lewat pintu
darurat — sebelum alarm penuh. Baca cone-nya, bayar tool-mu, dan jalan
keluar dengan berlian.

- **3 rute:** aula utama (cepat, dijaga ketat), ventilasi (lambat, aman,
  sempit), grid laser (cepat, berwaktu).
- **3 tool berbayar:** smoke bomb, noise-maker, disguise — masing-masing
  satu kali pakai dan memotong skor.
- **2 guard patrol** dengan vision cone yang menyapu + **2 kamera dinding**
  dengan cone berputar; alarm 0–100, penuh berarti tertangkap.
- **3 difficulty** (Casual / Professional / Ghost) + endless setelah vault +
  grade S/A/B/C dengan layar akhir berstatistik.

Vanilla JavaScript + canvas 2D, tanpa library, tanpa network. Mainkan
dengan `node serve.ts` lalu buka http://localhost:8080/ — WASD/panah untuk
bergerak, Space memakai tool terpilih, 1/2/3 memilih tool, Shift jalan
pelan.
