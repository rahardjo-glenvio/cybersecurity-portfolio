import { Vector3 } from 'three'
import { HOVER } from './layout'

// Posisi tracking point per player (dibaca tiap frame, di luar React state).
export const markers = new Map()

const SLOTS = [
  [-0.6, 0.35],
  [0.6, 0.35],
  [0, -0.45],
  [-0.6, -0.45],
  [0.6, -0.45],
]

const nodeOf = (layout, roomId) => layout.nodes.get(roomId ?? 'lobby') ?? layout.lobby

// Posisi slot player di dalam room supaya dua player tidak bertumpuk.
export function slotPosition(layout, roomId, index) {
  const node = nodeOf(layout, roomId)
  const [dx, dz] = SLOTS[index % SLOTS.length]
  const k = node.shape === 'octagon' ? 1.6 : 1
  return new Vector3(node.x + dx * k, node.floorY + HOVER, node.z + dz * k)
}

// Rute sepanjang path backend: lewat pintu dan deck corridor, bukan
// menembus dinding. Hop tanpa corridor langsung menuju slot tujuan.
export function routeWaypoints(layout, path, index) {
  const points = []
  for (let i = 1; i < path.length; i++) {
    const hop = layout.links.get(`${path[i - 1] ?? 'lobby'}|${path[i]}`)
    if (hop) for (const p of hop) points.push(p.clone().setY(p.y + HOVER))
  }
  points.push(slotPosition(layout, path.at(-1), index))
  return points
}
