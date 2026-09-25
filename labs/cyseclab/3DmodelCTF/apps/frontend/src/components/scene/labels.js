import { CanvasTexture, SRGBColorSpace } from 'three'
import { ROOM_STATUS_COLOR } from '../../config/theme'
import { box, hexAlpha, pill, text } from '../../utils/canvas'

function toTexture(canvas) {
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')]
}

// Papan nama room. Room LOCKED hanya menampilkan nama (layout publik),
// tanpa kategori/poin karena backend memang tidak mengirimnya.
export function roomLabelTexture(room) {
  const [c, ctx] = canvas(512, 150)
  const color = ROOM_STATUS_COLOR[room.status]
  box(ctx, 4, 4, 504, 142, { fill: 'rgba(6,10,18,0.88)', stroke: hexAlpha(color, 0.9), radius: 18, lineWidth: 4 })
  text(ctx, room.name ?? room.id, 26, 62, { size: 40, weight: 800, color: '#f1f5f9' })
  ctx.font = '800 20px sans-serif'
  const detail =
    room.status === 'LOCKED'
      ? 'SEALED · prerequisite belum terpenuhi'
      : `${String(room.category ?? '').toUpperCase()} · ${room.points ?? 0} PTS`
  text(ctx, detail, 26, 114, { size: 22, weight: 700, color: room.status === 'LOCKED' ? '#64748b' : '#94a3b8' })
  ctx.font = '800 20px monospace'
  const width = ctx.measureText(room.status).width + 26
  pill(ctx, room.status, 486 - width, 58, color, 20)
  return toTexture(c)
}

export function playerLabelTexture(name, color) {
  const [c, ctx] = canvas(128, 64)
  box(ctx, 4, 8, 120, 48, { fill: color, radius: 24 })
  text(ctx, name, 64, 44, { size: 30, weight: 900, color: '#04070d', align: 'center' })
  return toTexture(c)
}

export function plainLabelTexture(label, color = '#7dd3fc') {
  const [c, ctx] = canvas(512, 96)
  box(ctx, 4, 4, 504, 88, { fill: 'rgba(6,10,18,0.8)', stroke: hexAlpha(color, 0.7), radius: 16, lineWidth: 3 })
  text(ctx, label, 256, 62, { size: 38, weight: 800, color, align: 'center' })
  return toTexture(c)
}
