import { LOBBY_ID } from '@lab/shared'

export class MapConfigError extends Error {}

// Membaca konfigurasi map (JSON) menjadi graph yang sudah divalidasi.
// Tidak ada logika khusus map tertentu: semua dari prerequisites di JSON.
//
// Field room:
//   id, name, category, stage, points, position3D, size?, type? ('room'|'core'),
//   prerequisites: [roomId], requires?: 'all' | 'any' (default 'all'),
//   challengeId (referensi ke CTF engine)
// `unlocks` diturunkan otomatis dari prerequisites (kebalikan edge).
export function createMapGraph(config) {
  if (!config?.id || !Array.isArray(config.rooms) || !config.rooms.length) {
    throw new MapConfigError('Map config wajib punya id dan minimal satu room')
  }

  const rooms = new Map()
  for (const r of config.rooms) {
    if (!r.id) throw new MapConfigError('Setiap room wajib punya id')
    if (r.id === LOBBY_ID) throw new MapConfigError(`"${LOBBY_ID}" adalah id cadangan`)
    if (rooms.has(r.id)) throw new MapConfigError(`Room id ganda: ${r.id}`)
    const requires = r.requires ?? 'all'
    if (requires !== 'all' && requires !== 'any') throw new MapConfigError(`requires tidak valid di ${r.id}`)
    rooms.set(r.id, {
      type: 'room',
      points: 0,
      stage: 1,
      size: [3.2, 2.6],
      ...r,
      requires,
      prerequisites: [...(r.prerequisites ?? [])],
      unlocks: [],
    })
  }

  for (const room of rooms.values()) {
    for (const pre of room.prerequisites) {
      const parent = rooms.get(pre)
      if (!parent) throw new MapConfigError(`Prerequisite "${pre}" di room "${room.id}" tidak ada`)
      parent.unlocks.push(room.id)
    }
  }

  const order = topologicalOrder(rooms)
  const entryRooms = order.filter((id) => rooms.get(id).prerequisites.length === 0)
  if (!entryRooms.length) throw new MapConfigError('Map butuh minimal satu room tanpa prerequisite')

  // Corridor = jalur fisik untuk pergerakan player (bukan aturan unlock).
  const corridors = []
  const adjacency = new Map([[LOBBY_ID, new Set()], ...order.map((id) => [id, new Set()])])
  const addCorridor = (from, to, kind) => {
    if (!adjacency.has(from) || !adjacency.has(to)) throw new MapConfigError(`Link tidak valid: ${from} -> ${to}`)
    if (adjacency.get(from).has(to)) return
    adjacency.get(from).add(to)
    adjacency.get(to).add(from)
    corridors.push({ from, to, kind })
  }
  for (const id of order) for (const pre of rooms.get(id).prerequisites) addCorridor(pre, id, 'dependency')
  for (const [a, b] of config.links ?? []) addCorridor(a, b, 'link')
  for (const id of entryRooms) addCorridor(LOBBY_ID, id, 'lobby')

  return {
    id: config.id,
    name: config.name ?? config.id,
    version: config.version ?? 1,
    rooms,
    order,
    entryRooms,
    coreRooms: order.filter((id) => rooms.get(id).type === 'core'),
    corridors,
    adjacency,
    lobby: { id: LOBBY_ID, name: 'Lobby', position3D: config.lobby?.position3D ?? [0, 0, 8] },
    // Field layout yang boleh dikirim untuk room LOCKED (tanpa metadata challenge).
    lockedRoomFields: config.lockedRoomFields ?? ['id', 'name', 'stage', 'type', 'position3D', 'size'],
    totalPoints: order.reduce((sum, id) => sum + (rooms.get(id).points ?? 0), 0),
  }
}

// Kahn's algorithm: sekaligus mendeteksi siklus dependency.
function topologicalOrder(rooms) {
  const indegree = new Map([...rooms.keys()].map((id) => [id, rooms.get(id).prerequisites.length]))
  const queue = [...rooms.keys()].filter((id) => indegree.get(id) === 0)
  const order = []
  while (queue.length) {
    const id = queue.shift()
    order.push(id)
    for (const next of rooms.get(id).unlocks) {
      indegree.set(next, indegree.get(next) - 1)
      if (indegree.get(next) === 0) queue.push(next)
    }
  }
  if (order.length !== rooms.size) throw new MapConfigError('Dependency graph punya siklus')
  return order
}
