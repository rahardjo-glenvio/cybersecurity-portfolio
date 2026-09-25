import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import { SURFACE } from '../../../config/theme'
import { MONO, hexAlpha } from '../../../utils/canvas'

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')]
}

function toTexture(c, { repeat = false, srgb = true } = {}) {
  const t = new CanvasTexture(c)
  if (srgb) t.colorSpace = SRGBColorSpace
  if (repeat) t.wrapS = t.wrapT = RepeatWrapping
  t.anisotropy = 8
  return t
}

// Satu tile = 4×4 m (UV deck dalam meter, repeat 1/4). Pelat 2 m dengan
// seam gelap dan sedikit variasi tone supaya lantai tidak terlihat datar.
export function deckTextures() {
  const S = 512
  const [c, ctx] = canvas(S, S)
  ctx.fillStyle = SURFACE.deck
  ctx.fillRect(0, 0, S, S)
  const tones = ['rgba(255,255,255,0.018)', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.03)', 'rgba(255,255,255,0.01)']
  tones.forEach((tone, i) => {
    ctx.fillStyle = tone
    ctx.fillRect((i % 2) * (S / 2), Math.floor(i / 2) * (S / 2), S / 2, S / 2)
  })
  ctx.strokeStyle = 'rgba(2,5,10,0.9)'
  ctx.lineWidth = 3
  for (const p of [0, S / 2]) {
    ctx.strokeRect(p + 1.5, -2, 0, S + 4)
    ctx.strokeRect(-2, p + 1.5, S + 4, 0)
  }
  ctx.strokeStyle = 'rgba(120,160,220,0.07)'
  ctx.lineWidth = 1
  for (const p of [4, S / 2 + 4]) {
    ctx.strokeRect(p, -2, 0, S + 4)
    ctx.strokeRect(-2, p, S + 4, 0)
  }

  // Emissive: titik cahaya kecil di sudut tile 4 m.
  const [e, ectx] = canvas(S / 4, S / 4)
  ectx.fillStyle = '#000'
  ectx.fillRect(0, 0, S / 4, S / 4)
  ectx.fillStyle = '#35c7e6'
  for (const [x, y] of [[0, 0], [S / 4, 0], [0, S / 4], [S / 4, S / 4]]) {
    ectx.beginPath()
    ectx.arc(x, y, 1.4, 0, Math.PI * 2)
    ectx.fill()
  }
  return { map: toTexture(c, { repeat: true }), emissiveMap: toTexture(e, { repeat: true }) }
}

// Bayangan kontak murah di kaki modul (baked-feel).
export function blobTexture() {
  const [c, ctx] = canvas(128, 128)
  const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 64)
  g.addColorStop(0, 'rgba(0,0,0,0.6)')
  g.addColorStop(0.55, 'rgba(0,0,0,0.28)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return toTexture(c, { srgb: false })
}

// Marking lantai (mis. LOBBY). Rasio kanvas 1024×160 -> plane 6.4 : 1.
export function floorLabelTexture(label, color) {
  const [c, ctx] = canvas(1024, 160)
  ctx.font = `700 78px ${MONO}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.letterSpacing = '14px'
  ctx.fillStyle = hexAlpha(color, 0.85)
  ctx.fillText(label, 512, 84)
  ctx.fillStyle = hexAlpha(color, 0.5)
  ctx.fillRect(40, 146, 944, 4)
  return toTexture(c)
}
