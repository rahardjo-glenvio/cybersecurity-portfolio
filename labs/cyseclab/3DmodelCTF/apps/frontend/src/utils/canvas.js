import { CanvasTexture, SRGBColorSpace } from 'three'

// Helper menggambar konten layar di canvas 2D.
export const MONO = '"JetBrains Mono", "Cascadia Mono", Consolas, ui-monospace, SFMono-Regular, Menlo, monospace'

export const font = (size, weight = 500) => `${weight} ${size}px ${MONO}`

export function fillBackground(ctx, w, h, top = '#07121f', bottom = '#030710') {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, top)
  g.addColorStop(1, bottom)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

export function scanlines(ctx, w, h, alpha = 0.08) {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 2)
}

export function text(ctx, str, x, y, { size = 24, weight = 500, color = '#cbd5e1', align = 'left' } = {}) {
  ctx.font = font(size, weight)
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(str, x, y)
}

export function box(ctx, x, y, w, h, { fill, stroke, radius = 8, lineWidth = 2 } = {}) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, radius)
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = lineWidth
    ctx.stroke()
  }
}

export function pill(ctx, label, x, y, color, size = 18) {
  ctx.font = font(size, 700)
  const w = ctx.measureText(label).width + size * 1.2
  const h = size * 1.6
  box(ctx, x, y - h + size * 0.45, w, h, { fill: hexAlpha(color, 0.16), stroke: color, radius: h / 2, lineWidth: 2 })
  text(ctx, label, x + w / 2, y, { size, weight: 700, color, align: 'center' })
  return w
}

export function wrapText(ctx, str, maxWidth) {
  const words = str.split(' ')
  const lines = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

export function hexAlpha(hex, alpha) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

// Label statis (misal nama node) sebagai texture transparan.
export function createLabelTexture(lines, { width = 256, height = 96, color = '#ffffff' } = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.textAlign = 'center'
  ctx.fillStyle = color
  const step = height / (lines.length + 1)
  lines.forEach((line, i) => {
    ctx.font = font(i === 0 ? height * 0.36 : height * 0.26, i === 0 ? 800 : 600)
    ctx.fillText(line, width / 2, step * (i + 1) + height * 0.1)
  })
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}
