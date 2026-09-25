import { EVENT_TYPES, LOBBY_ID, ROOM_STATUS } from '@lab/shared'

// Progression milik TEAM. Posisi milik PLAYER (dikelola terpisah).
// Fungsi di sini murni terhadap graph; `progress` dimutasi oleh pemanggil
// yang memegang state (backend GameState).

export function createTeamProgress(graph) {
  return { solved: new Set(), unlocked: new Set(graph.entryRooms), solvedBy: {} }
}

export function prerequisitesMet(graph, progress, roomId) {
  const room = graph.rooms.get(roomId)
  if (!room.prerequisites.length) return true
  const met = room.prerequisites.filter((id) => progress.solved.has(id)).length
  return room.requires === 'any' ? met > 0 : met === room.prerequisites.length
}

// Menandai room solved lalu membuka room lain yang dependency-nya terpenuhi.
// Mengembalikan outcome berupa event semantik (ROOM_SOLVED, ROOM_UNLOCKED, ...).
export function solveRoom(graph, progress, roomId, { playerId = null } = {}) {
  const room = graph.rooms.get(roomId)
  if (!room) return { ok: false, reason: 'UNKNOWN_ROOM' }
  if (!progress.unlocked.has(roomId)) return { ok: false, reason: 'LOCKED' }
  if (progress.solved.has(roomId)) return { ok: false, reason: 'ALREADY_SOLVED' }

  progress.solved.add(roomId)
  progress.solvedBy[roomId] = playerId
  const outcomes = [{ type: EVENT_TYPES.ROOM_SOLVED, roomId, points: room.points }]
  if (room.type === 'core') outcomes.push({ type: EVENT_TYPES.CORE_BREACHED, roomId })

  for (const nextId of room.unlocks) {
    if (progress.unlocked.has(nextId) || !prerequisitesMet(graph, progress, nextId)) continue
    outcomes.push(...unlockOutcomes(graph, progress, nextId))
  }
  return { ok: true, outcomes }
}

// Override LAB: buka room tanpa memenuhi prerequisite.
export function forceUnlock(graph, progress, roomId) {
  if (!graph.rooms.has(roomId)) return { ok: false, reason: 'UNKNOWN_ROOM' }
  if (progress.unlocked.has(roomId)) return { ok: false, reason: 'ALREADY_UNLOCKED' }
  return { ok: true, outcomes: unlockOutcomes(graph, progress, roomId) }
}

function unlockOutcomes(graph, progress, roomId) {
  progress.unlocked.add(roomId)
  const outcomes = [{ type: EVENT_TYPES.ROOM_UNLOCKED, roomId }]
  if (graph.rooms.get(roomId).type === 'core') outcomes.push({ type: EVENT_TYPES.CORE_UNLOCKED, roomId })
  return outcomes
}

// Status room untuk sebuah tim. ACTIVE = unlocked, belum solved, ada player tim di dalamnya.
export function roomStatus(progress, roomId, occupiedRooms = new Set()) {
  if (progress.solved.has(roomId)) return ROOM_STATUS.SOLVED
  if (!progress.unlocked.has(roomId)) return ROOM_STATUS.LOCKED
  return occupiedRooms.has(roomId) ? ROOM_STATUS.ACTIVE : ROOM_STATUS.AVAILABLE
}

// Player hanya boleh masuk room AVAILABLE/ACTIVE/SOLVED (atau lobby).
export function canEnter(progress, roomId) {
  return roomId === LOBBY_ID || progress.unlocked.has(roomId)
}

// Jalur terpendek lewat corridor yang bisa diakses tim (BFS).
export function findPath(graph, progress, from, to) {
  const start = from ?? LOBBY_ID
  if (start === to) return [to]
  const prev = new Map([[start, null]])
  const queue = [start]
  while (queue.length) {
    const node = queue.shift()
    for (const next of graph.adjacency.get(node) ?? []) {
      if (prev.has(next) || !canEnter(progress, next)) continue
      prev.set(next, node)
      if (next === to) {
        const path = [to]
        for (let p = node; p !== null; p = prev.get(p)) path.unshift(p)
        return path
      }
      queue.push(next)
    }
  }
  return [start, to]
}

export function teamScore(graph, progress) {
  let score = 0
  for (const id of progress.solved) score += graph.rooms.get(id)?.points ?? 0
  return score
}
