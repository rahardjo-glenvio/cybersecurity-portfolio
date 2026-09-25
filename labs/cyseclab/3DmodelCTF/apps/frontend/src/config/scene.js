// Konfigurasi visual scene 3D. Nilai dikalibrasi bersama (lihat
// docs/visual-audit.md); ubah satu per satu sambil melihat hasilnya.

export const LIGHTING = {
  // Fill lembut dari langit; tanpa ambient supaya sisi bayangan tetap punya bentuk.
  hemisphere: { sky: '#7c93d6', ground: '#070b14', intensity: 0.8 },
  // Key: cahaya dingin dari depan-kanan atas, satu-satunya yang membuat shadow.
  key: { color: '#e4ecff', intensity: 2.9, offset: [10, 17, 9], shadowMapSize: 2048 },
  // Rim teal dari belakang-kiri untuk memisahkan siluet dari background.
  rim: { color: '#3fd8f0', intensity: 1.5, offset: [-10, 8, -16] },
  // Accent di atas core; warnanya mengikuti status core.
  core: { intensity: 26, distance: 14, height: 3.4 },
  lobby: { color: '#38bdf8', intensity: 7, distance: 7, height: 1.8 },
}

export const ATMOSPHERE = {
  zenith: '#02040a',
  horizon: '#0c1a2e',
  fog: '#0a1424',
  fogNear: 26,
  fogFar: 80,
  particles: 140,
}

export const CAMERA = {
  fov: 40,
  azimuth: (36 * Math.PI) / 180, // dari sumbu +Z ke +X
  elevation: (36 * Math.PI) / 180,
  fitScale: 0.7, // jarak = radius bounds / tan(fov/2) * fitScale
  targetY: 2.3,
  roomOffset: [4.6, 4.8, 6.4],
}

export const POST = {
  bloom: { intensity: 0.7, threshold: 0.95, smoothing: 0.3, radius: 0.62 },
  vignette: { offset: 0.3, darkness: 0.45 },
}
