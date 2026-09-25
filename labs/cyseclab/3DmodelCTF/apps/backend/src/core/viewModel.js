import { LOBBY_ID, ROOM_STATUS } from '@lab/shared'
import { canEnter, roomStatus, teamScore } from '@lab/game-engine'

// Proyeksi state untuk client. Di sinilah room locking ditegakkan:
// room LOCKED hanya mengirim field layout, tanpa metadata challenge.

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]))

function publicPlayer(p, graph) {
  return {
    id: p.id,
    name: p.name,
    color: p.color,
    currentRoom: p.currentRoom ?? LOBBY_ID,
    currentRoomName: p.currentRoom ? graph.rooms.get(p.currentRoom)?.name : 'Lobby',
    activityState: p.activityState,
    lastActivity: p.lastActivity,
    tool: p.tool ? { label: p.tool.label, category: p.tool.category } : null,
  }
}

export function teamSnapshot(state, teamId) {
  const team = state.teams.get(teamId)
  if (!team) return null
  const { graph } = state
  const players = team.playerIds.map((id) => state.players.get(id))
  const occupied = new Set(players.map((p) => p.currentRoom).filter(Boolean))

  const rooms = graph.order.map((id) => {
    const room = graph.rooms.get(id)
    const status = roomStatus(team.progress, id, occupied)
    const view = { ...pick(room, graph.lockedRoomFields), id, status }
    if (status !== ROOM_STATUS.LOCKED) {
      Object.assign(view, {
        category: room.category,
        points: room.points,
        instanceActive: team.instances.has(id),
        solvedBy: team.progress.solvedBy[id] ?? null,
      })
    }
    return view
  })

  return {
    id: team.id,
    name: team.name,
    color: team.color,
    score: teamScore(graph, team.progress),
    solvedCount: team.progress.solved.size,
    totalRooms: graph.order.length,
    coreBreached: graph.coreRooms.some((id) => team.progress.solved.has(id)),
    rooms,
    corridors: graph.corridors.map((c) => ({ ...c, open: canEnter(team.progress, c.from) && canEnter(team.progress, c.to) })),
    lobby: graph.lobby,
    players: players.map((p) => publicPlayer(p, graph)),
  }
}

export function overview(state) {
  const { graph } = state
  return [...state.teams.values()].map((team) => ({
    id: team.id,
    name: team.name,
    color: team.color,
    score: teamScore(graph, team.progress),
    solvedCount: team.progress.solved.size,
    unlockedCount: team.progress.unlocked.size,
    totalRooms: graph.order.length,
    coreBreached: graph.coreRooms.some((id) => team.progress.solved.has(id)),
    players: team.playerIds.map((id) => publicPlayer(state.players.get(id), graph)),
  }))
}

// Detail room untuk tim. LOCKED -> hanya id + status. Flag dan isi hint
// tidak pernah dikirim; instance host hanya untuk tim pemilik instance.
export function roomDetail(state, teamId, roomId) {
  const team = state.teams.get(teamId)
  const room = state.graph.rooms.get(roomId)
  if (!team || !room) return null
  if (!canEnter(team.progress, roomId)) return { id: roomId, status: ROOM_STATUS.LOCKED }

  const occupied = new Set(team.playerIds.map((id) => state.players.get(id).currentRoom).filter(Boolean))
  const challenge = state.challenges.get(room.challengeId)
  const instance = team.instances.get(roomId)
  return {
    id: room.id,
    name: room.name,
    status: roomStatus(team.progress, roomId, occupied),
    category: room.category,
    points: room.points,
    stage: room.stage,
    prerequisites: room.prerequisites.map((id) => ({ id, name: state.graph.rooms.get(id).name })),
    unlocks: room.unlocks.map((id) => ({ id, name: state.graph.rooms.get(id).name })),
    challenge: challenge
      ? {
          title: challenge.title,
          description: challenge.description,
          files: (challenge.files ?? []).map((f) => ({ name: f.name, size: f.size })),
          hasHint: !!challenge.hint,
          hasInstance: !!challenge.instance,
          instance: instance ? { running: true, host: instance.host } : { running: false },
        }
      : null,
  }
}

export function matchInfo(state) {
  const m = state.match
  return m ? { id: m.id, name: m.name, phase: m.phase, startedAt: m.startedAt, durationMs: m.durationMs, mapId: m.mapId } : null
}
