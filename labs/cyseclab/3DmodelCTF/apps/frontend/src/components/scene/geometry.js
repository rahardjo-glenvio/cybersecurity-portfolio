import { BoxGeometry, BufferGeometry, Float32BufferAttribute, Shape, ShapeGeometry, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Box statis: [sx, sy, sz, px, py, pz, rotY?]. Digabung jadi satu geometri
// supaya satu room = sedikit draw call.
export function box([sx, sy, sz, px, py, pz, rotY = 0]) {
  const g = new BoxGeometry(sx, sy, sz)
  if (rotY) g.rotateY(rotY)
  return g.translate(px, py, pz)
}

export function mergeAll(geometries) {
  const list = geometries.filter(Boolean)
  if (!list.length) return null
  const merged = mergeGeometries(list)
  for (const g of list) g.dispose()
  return merged
}

export const mergeBoxes = (pieces) => mergeAll(pieces.map(box))

// Bingkai persegi datar (outline lantai) di bidang XZ, lebar pita `band`.
export function rectFrame(w, d, band) {
  const outer = new Shape()
  outer.moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).closePath()
  const hole = new Shape()
  const [iw, id] = [w / 2 - band, d / 2 - band]
  hole.moveTo(-iw, -id).lineTo(-iw, id).lineTo(iw, id).lineTo(iw, -id).closePath()
  outer.holes.push(hole)
  return new ShapeGeometry(outer).rotateX(-Math.PI / 2)
}

// ---------- Corridor strip ----------

const UP = new Vector3(0, 1, 0)
const perp = (d) => new Vector3(-d.z, 0, d.x).normalize()

// Offset kiri/kanan per titik. Ujung mengikuti tepi room (tangent port)
// supaya deck menempel rata; sambungan tengah memakai miter.
function sideOffsets(points, tangents, width) {
  const dirs = points.slice(1).map((p, i) => p.clone().sub(points[i]))
  return points.map((_, i) => {
    const before = dirs[Math.max(0, i - 1)]
    const after = dirs[Math.min(dirs.length - 1, i)]
    const n = perp(i === 0 ? after : before)
    if (i === 0 || i === points.length - 1) {
      const t = tangents[i === 0 ? 0 : 1].clone()
      if (t.dot(n) < 0) t.negate()
      return t.multiplyScalar(width / 2)
    }
    const s = perp(before).add(perp(after)).normalize()
    return s.multiplyScalar(width / 2 / Math.max(0.35, s.dot(perp(before))))
  })
}

function pushTri(pos, uv, a, b, c, ua, ub, uc, facing) {
  const n = b.clone().sub(a).cross(c.clone().sub(a))
  if (n.dot(facing) < 0) [b, c, ub, uc] = [c, b, uc, ub]
  pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
  uv.push(...ua, ...ub, ...uc)
}

// Deck corridor: permukaan atas (+ badan setebal `thickness` bila diminta).
// UV.x = jarak sepanjang jalur dalam meter, UV.y = 0..1 melintang.
export function corridorGeometry(points, tangents, width, { thickness = 0, lift = 0 } = {}) {
  const offsets = sideOffsets(points, tangents, width)
  const along = [0]
  for (let i = 1; i < points.length; i++) along.push(along[i - 1] + points[i].distanceTo(points[i - 1]))
  const L = points.map((p, i) => p.clone().add(offsets[i]).setY(p.y + lift))
  const R = points.map((p, i) => p.clone().sub(offsets[i]).setY(p.y + lift))
  const down = new Vector3(0, -thickness, 0)
  const pos = []
  const uv = []

  for (let i = 0; i < points.length - 1; i++) {
    const [l0, l1, r0, r1] = [L[i], L[i + 1], R[i], R[i + 1]]
    const [a0, a1] = [along[i], along[i + 1]]
    pushTri(pos, uv, l0, r0, l1, [a0, 1], [a0, 0], [a1, 1], UP)
    pushTri(pos, uv, r0, r1, l1, [a0, 0], [a1, 0], [a1, 1], UP)
    if (!thickness) continue
    const [bl0, bl1, br0, br1] = [l0, l1, r0, r1].map((v) => v.clone().add(down))
    const out = offsets[i].clone().normalize()
    pushTri(pos, uv, bl0, bl1, br0, [a0, 1], [a1, 1], [a0, 0], UP.clone().negate())
    pushTri(pos, uv, br0, bl1, br1, [a0, 0], [a1, 1], [a1, 0], UP.clone().negate())
    pushTri(pos, uv, l0, l1, bl0, [a0, 1], [a1, 1], [a0, 1], out)
    pushTri(pos, uv, bl0, l1, bl1, [a0, 1], [a1, 1], [a1, 1], out)
    pushTri(pos, uv, r0, br0, r1, [a0, 0], [a0, 0], [a1, 0], out.clone().negate())
    pushTri(pos, uv, br0, br1, r1, [a0, 0], [a1, 0], [a1, 0], out.clone().negate())
  }

  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.computeVertexNormals()
  return g
}
