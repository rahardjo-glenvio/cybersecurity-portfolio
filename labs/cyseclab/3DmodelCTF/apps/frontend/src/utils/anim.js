import { MathUtils } from 'three'

// Frame-rate independent smoothing (exponential decay).
export const damp = MathUtils.damp

export const clamp01 = (v) => Math.min(1, Math.max(0, v))

export const lerp = (a, b, t) => a + (b - a) * t

export const smoothstep = (edge0, edge1, x) => {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp01(t), 3)

export const easeInOutSine = (t) => -(Math.cos(Math.PI * clamp01(t)) - 1) / 2

export const easeOutBack = (t) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  const x = clamp01(t) - 1
  return 1 + c3 * x * x * x + c1 * x * x
}

// Envelope naik-tahan-turun untuk efek sementara. Nilai 0..1.
export const envelope = (age, attack, hold, release) => {
  if (age < 0) return 0
  if (age < attack) return age / attack
  if (age < attack + hold) return 1
  return clamp01(1 - (age - attack - hold) / release)
}

export const wrapAngle = (a) => {
  let x = (a + Math.PI) % (Math.PI * 2)
  if (x < 0) x += Math.PI * 2
  return x - Math.PI
}

// Damp sudut lewat jalur terpendek.
export const dampAngle = (current, target, lambda, dt) =>
  current + wrapAngle(target - current) * (1 - Math.exp(-lambda * dt))

// Pseudo-random deterministik untuk kedipan LED, partikel, dll.
export const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

export const easeInOutCubic = (t) => {
  const x = clamp01(t)
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}
