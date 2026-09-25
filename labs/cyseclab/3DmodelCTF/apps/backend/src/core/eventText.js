import { EVENT_TYPES as E, LOBBY_ID } from '@lab/shared'

// Payload yang boleh keluar ke semua client (battle feed). Nama file,
// host instance, isi flag, dan detail lain tidak ikut.
const PUBLIC_PAYLOAD = {
  [E.PLAYER_ENTERED_ROOM]: ['from', 'path'],
  [E.PLAYER_ACTIVE]: ['activity'],
  [E.TOOL_OPENED]: ['tool', 'label', 'category', 'activity'],
  [E.TOOL_CLOSED]: ['tool', 'label', 'category', 'activity'],
  [E.FLAG_ATTEMPT]: ['attempt'],
  [E.ROOM_SOLVED]: ['points'],
  [E.MATCH_STARTED]: ['mapId'],
}

export function toPublicEvent(event) {
  const allowed = PUBLIC_PAYLOAD[event.type] ?? []
  const payload = {}
  for (const key of allowed) if (event.payload?.[key] !== undefined) payload[key] = event.payload[key]
  return {
    eventId: event.eventId,
    type: event.type,
    teamId: event.teamId ?? null,
    playerId: event.playerId ?? null,
    roomId: event.roomId ?? null,
    source: event.source,
    lab: !!event.lab,
    payload,
    summary: event.summary,
    timestamp: event.timestamp,
  }
}

// Kalimat battle feed dibuat di backend: tanpa flag, jawaban, command, atau exploit.
export function describeEvent(event, state) {
  const team = state.teams.get(event.teamId)?.name ?? ''
  const player = state.players.get(event.playerId)?.name ?? ''
  const who = team && player ? `${team} · ${player}` : team
  const room = event.roomId === LOBBY_ID ? 'Lobby' : state.graph.rooms.get(event.roomId)?.name ?? event.roomId
  const p = event.payload ?? {}

  switch (event.type) {
    case E.MATCH_STARTED:
      return `Match dimulai · ${state.graph.name}`
    case E.PLAYER_ENTERED_ROOM:
      return `${who} entered ${room}`
    case E.PLAYER_LEFT_ROOM:
      return `${who} left ${room}`
    case E.PLAYER_ACTIVE:
      return `${who} active${p.activity ? ` · ${p.activity.replace('_ACTIVITY', '').toLowerCase()}` : ''}`
    case E.PLAYER_IDLE:
      return `${who} idle`
    case E.TOOL_OPENED:
      return `${who} opened ${p.label ?? 'a tool'}`
    case E.TOOL_CLOSED:
      return `${who} closed ${p.label ?? 'a tool'}`
    case E.FILE_DOWNLOADED:
      return `${who} downloaded a challenge file`
    case E.INSTANCE_STARTED:
      return `${who} started challenge instance`
    case E.INSTANCE_STOPPED:
      return `${who} stopped challenge instance`
    case E.FLAG_ATTEMPT:
      return `${who} submitted a flag`
    case E.FLAG_WRONG:
      return `${who} wrong flag`
    case E.FLAG_CORRECT:
      return `${who} correct flag`
    case E.ROOM_SOLVED:
      return `${team} solved ${room} (+${p.points ?? 0})`
    case E.ROOM_UNLOCKED:
      return `${team} unlocked ${room}`
    case E.CORE_UNLOCKED:
      return `${team} unlocked the CORE`
    case E.CORE_BREACHED:
      return `${team} breached ${room}`
    case E.LAB_TEAM_RESET:
      return `${team} di-reset (LAB)`
    default:
      return `${who} ${event.type}`
  }
}
