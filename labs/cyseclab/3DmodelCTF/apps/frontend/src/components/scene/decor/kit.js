import { useEffect, useMemo } from 'react'
import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  RepeatWrapping,
  ShaderMaterial,
  SRGBColorSpace,
} from 'three'
import { hash } from '../../../utils/anim'
import { MONO } from '../../../utils/canvas'
import { mergeAll } from '../geometry'

// Perkakas bersama untuk dekorasi room: DSL geometri, tekstur canvas,
// material field additive, dan easing. Props kategori ada di ./props.

// ---------- Geometri ----------

// Transformasi urut: rotasi X, Y, Z lalu translasi ke `at`.
export function place(g, at = [0, 0, 0], [rx = 0, ry = 0, rz = 0] = []) {
  if (rx) g.rotateX(rx)
  if (ry) g.rotateY(ry)
  if (rz) g.rotateZ(rz)
  return g.translate(...at)
}

export const box = (size, at, rot) => place(new BoxGeometry(...size), at, rot)

// [radiusAtas, radiusBawah, tinggi, segmen, thetaStart?]
export const cyl = ([rt, rb, h, seg = 8, theta = 0], at, rot) =>
  place(new CylinderGeometry(rt, rb, h, seg, 1, false, theta), at, rot)

// Geometri statis yang di-merge sekali per annex dan dibuang saat unmount.
export function useMerged(build, deps) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const g = useMemo(() => mergeAll(build()), deps)
  useEffect(() => () => g?.dispose(), [g])
  return g
}

const disposeDeep = (v) => (Array.isArray(v) ? v.forEach(disposeDeep) : v?.dispose?.())

// Objek berisi geometri/material/tekstur (boleh array) yang dibuang saat unmount.
export function useDisposables(build, deps) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(build, deps)
  useEffect(() => () => Object.values(value).forEach(disposeDeep), [value])
  return value
}

// ---------- Waktu & easing ----------

export const smooth = (t) => t * t * (3 - 2 * t)
export const clamp01 = (t) => Math.min(1, Math.max(0, t))
// Nilai 0..1 dengan fase tahan-naik-tahan-turun dalam satu siklus (detik).
export function cycle(time, period, [hold0, rise, hold1, fall]) {
  const t = ((time % period) + period) % period
  if (t < hold0) return 0
  if (t < hold0 + rise) return smooth((t - hold0) / rise)
  if (t < hold0 + rise + hold1) return 1
  if (t < hold0 + rise + hold1 + fall) return 1 - smooth((t - hold0 - rise - hold1) / fall)
  return 0
}

// ---------- Tekstur (singleton, dibagi semua room) ----------

const cache = new Map()
function cached(key, draw, { repeat = false, srgb = true } = {}) {
  if (cache.has(key)) return cache.get(key)
  const [w, h, paint] = draw()
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  paint(c.getContext('2d'), w, h)
  const t = new CanvasTexture(c)
  if (srgb) t.colorSpace = SRGBColorSpace
  if (repeat) t.wrapS = t.wrapT = RepeatWrapping
  t.anisotropy = 4
  cache.set(key, t)
  return t
}

// Cahaya lembut melingkar (light pool, halo).
export const radialTexture = () =>
  cached('radial', () => [
    128,
    128,
    (ctx) => {
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
      g.addColorStop(0, 'rgba(255,255,255,1)')
      g.addColorStop(0.45, 'rgba(255,255,255,0.35)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, 128, 128)
    },
  ], { srgb: false })

// Gradien vertikal terang di bawah -> hilang di atas (spill dinding, beam).
export const fadeTexture = () =>
  cached('fade', () => [
    4,
    128,
    (ctx) => {
      const g = ctx.createLinearGradient(0, 128, 0, 0)
      g.addColorStop(0, 'rgba(255,255,255,1)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, 4, 128)
    },
  ], { srgb: false })

// Konten "halaman web" yang bisa digulir vertikal tanpa sambungan.
export const webContentTexture = () =>
  cached('web', () => [
    128,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#050b14'
      ctx.fillRect(0, 0, w, h)
      let y = 6
      for (let i = 0; y < h - 10; i++) {
        const r = hash(i * 3.7)
        if (r < 0.22) {
          ctx.fillStyle = 'rgba(255,255,255,0.55)'
          ctx.fillRect(10, y, w - 20, 22) // blok gambar/hero
          y += 30
        } else {
          ctx.fillStyle = `rgba(255,255,255,${0.45 + r * 0.4})`
          ctx.fillRect(10, y, 16 + hash(i * 9.1) * (w - 36), 5)
          y += 11
        }
      }
    },
  ], { repeat: true })

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
// Pita glyph melingkar untuk sisi disk cipher.
export const glyphRingTexture = () =>
  cached('glyph-ring', () => [
    512,
    64,
    (ctx, w, h) => {
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#fff'
      ctx.font = `700 34px ${MONO}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const n = 16
      for (let i = 0; i < n; i++) ctx.fillText(GLYPHS[Math.floor(hash(i * 5.3) * GLYPHS.length)], ((i + 0.5) * w) / n, h / 2 + 2)
      ctx.fillRect(0, 2, w, 2)
      ctx.fillRect(0, h - 4, w, 2)
    },
  ], { repeat: true, srgb: false })

// Kolom glyph vertikal untuk obelisk ter-enkode.
export const glyphColumnTexture = () =>
  cached('glyph-col', () => [
    64,
    512,
    (ctx, w, h) => {
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)
      ctx.font = `700 30px ${MONO}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.35 + hash(i * 2.9) * 0.65})`
        ctx.fillText(GLYPHS[Math.floor(hash(i * 7.7) * GLYPHS.length)], w / 2, ((i + 0.5) * h) / 12)
      }
    },
  ], { repeat: true, srgb: false })

// Grid meja scan forensik.
export const scanGridTexture = () =>
  cached('scan-grid', () => [
    128,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'
      ctx.lineWidth = 1
      for (let i = 0; i <= 8; i++) {
        const p = Math.round((i * (w - 1)) / 8) + 0.5
        ctx.beginPath()
        ctx.moveTo(p, 0)
        ctx.lineTo(p, h)
        ctx.moveTo(0, p)
        ctx.lineTo(w, p)
        ctx.stroke()
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'
      ctx.lineWidth = 3
      ctx.strokeRect(2, 2, w - 4, h - 4)
    },
  ], { srgb: false })

// Garis hazard diagonal (palang checkpoint).
export const hazardTexture = () =>
  cached('hazard', () => [
    128,
    16,
    (ctx, w, h) => {
      ctx.fillStyle = '#1b2538'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#e8eef9'
      for (let x = -h; x < w + h; x += 32) {
        ctx.beginPath()
        ctx.moveTo(x, h)
        ctx.lineTo(x + 16, h)
        ctx.lineTo(x + 16 + h, 0)
        ctx.lineTo(x + h, 0)
        ctx.fill()
      }
    },
  ])

// ---------- Material ----------

// Bidang cahaya additive dengan pita bergerak (portal, curtain scan, beam
// otorisasi). Pita bergerak searah +V.
export function createFieldMaterial({ bands = 6, speed = 0.5, sharp = 6 } = {}) {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color() },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uBands: { value: bands },
      uSpeed: { value: speed },
      uSharp: { value: sharp },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uOpacity;
      uniform float uBands;
      uniform float uSpeed;
      uniform float uSharp;
      varying vec2 vUv;
      void main() {
        float band = pow(fract(vUv.y * uBands - uTime * uSpeed), uSharp);
        float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x)
                   * smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
        float a = (0.1 + band * 0.9) * edge * uOpacity;
        gl_FragColor = vec4(uColor * a, 1.0);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  })
}
