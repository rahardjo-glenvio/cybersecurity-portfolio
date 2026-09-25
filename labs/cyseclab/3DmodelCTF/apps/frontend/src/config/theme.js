// Palet tunggal untuk scene 3D dan UI (visual language prototype sebelumnya).
export const COLORS = {
  bg: '#05070d',
  floor: '#0e1624',
  wall: '#121c30',
  wallPanel: '#18243b',
  metal: '#1a2436',
  metalLight: '#2a3850',
  dim: '#1e293b',

  cyan: '#22d3ee',
  blue: '#3b82f6',
  teal: '#2dd4bf',
  green: '#22c55e',
  red: '#ef4444',
  amber: '#f59e0b',
  violet: '#a78bfa',
  slate: '#64748b',
}

export const TONES = { ...COLORS }

// Permukaan scene 3D: slate-blue yang cukup terang untuk menangkap key light
// dan pantulan env map, tetap gelap di layar setelah tone mapping.
export const SURFACE = {
  hull: '#3b4e72',
  slab: '#243149',
  plinth: '#1b2539',
  bridge: '#26344d',
  shutter: '#3a4c70',
  deck: '#0b1320',
  deckSide: '#0b1220',
  ground: '#05080f',
  rack: '#1a263b',
  rackUnit: '#26344f',
}

export const ROOM_STATUS_COLOR = {
  LOCKED: COLORS.slate,
  AVAILABLE: COLORS.cyan,
  ACTIVE: COLORS.blue,
  SOLVED: COLORS.green,
}

export const ACTIVITY_COLOR = {
  IDLE: COLORS.slate,
  ACTIVE: COLORS.cyan,
  ANALYZING: COLORS.violet,
  SUBMITTING: COLORS.amber,
  ERROR: COLORS.red,
  SUCCESS: COLORS.green,
}

export const LOCK_COLOR = COLORS.amber

const EVENT_TONE = {
  MATCH_STARTED: COLORS.cyan,
  PLAYER_ENTERED_ROOM: COLORS.cyan,
  PLAYER_LEFT_ROOM: COLORS.slate,
  PLAYER_ACTIVE: COLORS.cyan,
  PLAYER_IDLE: COLORS.slate,
  TOOL_OPENED: COLORS.violet,
  TOOL_CLOSED: COLORS.slate,
  FILE_DOWNLOADED: COLORS.cyan,
  INSTANCE_STARTED: COLORS.teal,
  INSTANCE_STOPPED: COLORS.slate,
  FLAG_ATTEMPT: COLORS.amber,
  FLAG_WRONG: COLORS.red,
  FLAG_CORRECT: COLORS.green,
  ROOM_SOLVED: COLORS.green,
  ROOM_UNLOCKED: COLORS.cyan,
  CORE_UNLOCKED: COLORS.amber,
  CORE_BREACHED: COLORS.green,
  LAB_TEAM_RESET: COLORS.amber,
}

export const eventTone = (type) => EVENT_TONE[type] ?? COLORS.slate
