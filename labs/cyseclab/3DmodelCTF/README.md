# CTF Arena · 3D Interaction Prototype

Prototype React + Vite + React Three Fiber untuk competition hall CTF Jeopardy: 40 tim, 2–3 peserta per tim (seeded), sekitar 100 bot yang duduk di team pod masing-masing. Setiap event bersifat per akun: 1 akun = 1 bot = 1 kursi = 1 laptop. Semua objek dibuat dari primitive geometry, tanpa model atau tekstur eksternal.

## Menjalankan

Butuh Node.js 20.19+ atau 22.12+.

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`.

### Mode standalone (tanpa server)

Core backend ikut berjalan di browser: database di memori, tanpa WebSocket. Cocok untuk demo statis (misalnya Artifact claude.ai).

```bash
npm run dev:standalone     # dev lokal tanpa backend
npm run build:standalone   # output statis: apps/frontend/dist-standalone/
```

State hilang saat halaman dimuat ulang dan tidak dibagi antar viewer. Flag mock ikut ter-bundle, jadi mode ini hanya untuk demo, bukan kompetisi.

### Scene 3D

Audit visual, keputusan desain, dan before/after ada di [`docs/visual-audit.md`](docs/visual-audit.md). Nilai lighting, fog, kamera, dan bloom diatur di `apps/frontend/src/config/scene.js`; layout (port corridor, bounds) dihitung otomatis dari map JSON di `components/scene/layout.js`.

## Kontrol

| Input | Aksi |
| --- | --- |
| Panel kiri | Pilih Team → Player → Challenge → Event |
| Keyboard `1`–`7` | Kirim event ke player terpilih |
| Klik team pod | Team focus (kamera terbang ke meja tim) |
| `Esc` | Kembali ke overview |
| `T` | Auto Traffic: event acak dari banyak akun (uji performa) |
| Drag / klik kanan / scroll | Orbit / pan / zoom |

## Event per akun

| Event | Reaksi (hanya bot akun tersebut) |
| --- | --- |
| IDLE | Duduk santai, napas halus, laptop redup |
| CHALLENGE_OPENED | Laptop menyala, bot condong, status ACTIVE |
| READING_DESCRIPTION | Fokus ke layar, konten layar scroll |
| DOWNLOADING_FILE | Ikon file 3D turun dari truss ke laptop, glow cyan, lalu kembali ke state kerja |
| INSTANCE_RUNNING | Beam koneksi ke network truss, LED instance di laptop menyala |
| WRONG_FLAG | Laptop flash merah, gesture berpikir, kembali ke ACTIVE setelah ~1,6 detik |
| CORRECT_FLAG | Laptop hijau, pulse, fist pump, skor & progress tim naik, lalu IDLE (challenge solved) |

Format data tim mengikuti `teamId`, `members[]` dengan `accountId`, `username`, `seat`, `state`, `challenge`. Lihat `src/data/mockArena.js`.

## Level of detail

| Mode | Isi |
| --- | --- |
| Overview | Seluruh hall. Bot jauh diupdate bergiliran (tiap 3 frame), tanpa gerak mikro |
| Nearby | Bot dalam radius 13 m dianimasikan penuh tiap frame (kedip, typing, gerak kepala) |
| Team focus | Bot tim diganti `BotModel` detail + ekspresi, label username/state/challenge, layar laptop dengan konten |

Optimasi utama:

- Bot crowd = 8 `InstancedMesh` (satu per segmen tubuh), kursi/laptop/layar = 5 `InstancedMesh`.
- Geometry primitive digabung dengan vertex color, material dipakai bersama, tanpa tekstur per peserta.
- Nama 40 tim memakai satu atlas tekstur dan satu mesh gabungan.
- Frustum test per bot: bot di luar kamera tidak dihitung.
- Tanpa shadow map; status memakai material emissive + bloom.
- Store kecil berbasis `useSyncExternalStore`: event hanya mengganti objek tim terkait. Render loop membaca `runtime` mutable, jadi tidak memicu re-render React.

HUD kiri atas menampilkan mode kamera, FPS, dan jumlah bot per tier LOD.

## Struktur

```
src/
├─ App.jsx                    # layout, keyboard, auto traffic
├─ config/                    # events, challenges, arenaLayout, theme
├─ data/                      # seededRandom (mulberry32), mockArena (40 tim)
├─ state/
│  ├─ arenaStore.js           # store + dispatchPlayerEvent (per akun)
│  └─ runtime.js              # data mutable per frame untuk render loop
├─ hooks/                     # useCanvasScreen, useAutoTraffic
├─ utils/                     # anim, canvas, geometry (merge + vertex color)
└─ components/
   ├─ ui/                     # EventDispatcher, TeamCard, StageHud, primitives
   └─ scene/
      ├─ Scene, Hall, JudgeArea, Scoreboard, ServerRack, TerminalPanel, CameraRig, Effects
      ├─ arena/               # BotCrowd, TeamPods, NetworkLinks, ArenaFx, FocusTeam, materials
      ├─ bot/                 # BotModel, poses (seated), rig, instancedBot
      ├─ fx/                  # ErrorMark, UnlockBurst (dipakai team focus)
      └─ screens/             # konten canvas: scoreboard, laptop, event console
```

## Integrasi backend nanti

Cukup panggil `dispatchPlayerEvent(accountId, EVENT_TYPE, challengeId)` dari event platform (WebSocket/SSE). Seluruh reaksi 3D, UI, skor, dan scoreboard mengikuti dari sana.
