import { CanvasTexture, SRGBColorSpace } from 'three'
import { box, text } from '../../utils/canvas'

// Label nama player di atas tracking point. Label room kini berupa chip
// HTML (RoomLabels) dan marking lantai ada di environment/textures.js.
export function playerLabelTexture(name, color) {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 64
  const ctx = c.getContext('2d')
  box(ctx, 4, 8, 120, 48, { fill: color, radius: 24 })
  text(ctx, name, 64, 44, { size: 30, weight: 900, color: '#04070d', align: 'center' })
  const texture = new CanvasTexture(c)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}
