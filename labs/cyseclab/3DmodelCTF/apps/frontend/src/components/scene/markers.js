import { Vector3 } from 'three'

// Posisi tracking point per player (dibaca tiap frame, di luar React state).
export const markers = new Map()

export const FLOOR_H = 0.2
const HOVER = 0.55

const SLOTS = [
  [-0.6, 0.35],
  [0.6, 0.35],
  [0, -0.45],
  [-0.6, -0.45],
  [0.6, -0.45],
]

function anchorOf(team, roomId) {
  if (!roomId || roomId === 'lobby') return { pos: team.lobby.position3D, core: false }
  const room = team.rooms.find((r) => r.id === roomId)
  return room ? { pos: room.position3D, core: room.type === 'core' } : { pos: team.lobby.position3D, core: false }
}

// Titik tengah room (dipakai sebagai titik lintasan saat melewati room).
export function roomCenter(team, roomId) {
  const { pos } = anchorOf(team, roomId)
  return new Vector3(pos[0], pos[1] + FLOOR_H + HOVER, pos[2])
}

// Posisi slot player di dalam room supaya dua player tidak bertumpuk.
export function slotPosition(team, roomId, index) {
  const { pos, core } = anchorOf(team, roomId)
  const [dx, dz] = SLOTS[index % SLOTS.length]
  const k = core ? 1.6 : 1
  return new Vector3(pos[0] + dx * k, pos[1] + FLOOR_H + HOVER, pos[2] + dz * k)
}
