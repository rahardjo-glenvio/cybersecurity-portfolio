// Konstanta yang dipakai bersama backend dan frontend.
// PENTING: package ini diimpor frontend, jadi jangan pernah menaruh
// data challenge (deskripsi, file, flag, hint) di sini.

export const EVENT_TYPES = Object.freeze({
  MATCH_STARTED: 'MATCH_STARTED',
  PLAYER_ENTERED_ROOM: 'PLAYER_ENTERED_ROOM',
  PLAYER_LEFT_ROOM: 'PLAYER_LEFT_ROOM',
  PLAYER_ACTIVE: 'PLAYER_ACTIVE',
  PLAYER_IDLE: 'PLAYER_IDLE',
  TOOL_OPENED: 'TOOL_OPENED',
  TOOL_CLOSED: 'TOOL_CLOSED',
  FILE_DOWNLOADED: 'FILE_DOWNLOADED',
  INSTANCE_STARTED: 'INSTANCE_STARTED',
  INSTANCE_STOPPED: 'INSTANCE_STOPPED',
  FLAG_ATTEMPT: 'FLAG_ATTEMPT',
  FLAG_WRONG: 'FLAG_WRONG',
  FLAG_CORRECT: 'FLAG_CORRECT',
  ROOM_SOLVED: 'ROOM_SOLVED',
  ROOM_UNLOCKED: 'ROOM_UNLOCKED',
  CORE_UNLOCKED: 'CORE_UNLOCKED',
  CORE_BREACHED: 'CORE_BREACHED',
  // Khusus LAB: reset tim dari debug panel (tetap dicatat di event log).
  LAB_TEAM_RESET: 'LAB_TEAM_RESET',
})

const E = EVENT_TYPES

// Event yang menentukan progression resmi. Hanya boleh dihasilkan backend
// (game engine / CTF engine), tidak pernah dari telemetry atau frontend.
export const AUTHORITATIVE_EVENTS = Object.freeze([
  E.MATCH_STARTED,
  E.FLAG_CORRECT,
  E.ROOM_SOLVED,
  E.ROOM_UNLOCKED,
  E.CORE_UNLOCKED,
  E.CORE_BREACHED,
])

// Event yang boleh berasal dari telemetry VM (setelah diproses).
export const TELEMETRY_EVENTS = Object.freeze([
  E.PLAYER_ACTIVE,
  E.PLAYER_IDLE,
  E.TOOL_OPENED,
  E.TOOL_CLOSED,
  E.FILE_DOWNLOADED,
])

export const ROOM_STATUS = Object.freeze({
  LOCKED: 'LOCKED',
  AVAILABLE: 'AVAILABLE',
  ACTIVE: 'ACTIVE',
  SOLVED: 'SOLVED',
})

export const ACTIVITY_STATE = Object.freeze({
  IDLE: 'IDLE',
  ACTIVE: 'ACTIVE',
  ANALYZING: 'ANALYZING',
  SUBMITTING: 'SUBMITTING',
  ERROR: 'ERROR',
  SUCCESS: 'SUCCESS',
})

// Kategori aktivitas semantik hasil interpretasi telemetry.
export const ACTIVITY_KIND = Object.freeze({
  WEB: 'WEB_ACTIVITY',
  REVERSING: 'REVERSING_ACTIVITY',
  CRYPTO: 'CRYPTO_ACTIVITY',
  FORENSICS: 'FORENSICS_ACTIVITY',
  PWN: 'PWN_ACTIVITY',
})

// Posisi awal player sebelum masuk room mana pun.
export const LOBBY_ID = 'lobby'

// Pesan WebSocket server -> client dan client -> server.
export const WS_MESSAGE = Object.freeze({
  HELLO: 'hello',
  OVERVIEW: 'overview',
  TEAM: 'team',
  EVENT: 'event',
  NOTICE: 'notice',
  SUBSCRIBE: 'subscribe',
})

export const LAB_COMMANDS = Object.freeze({
  ENTER_ROOM: 'enterRoom',
  SET_ACTIVE: 'setActive',
  SET_IDLE: 'setIdle',
  OPEN_TOOL: 'openTool',
  CLOSE_TOOL: 'closeTool',
  DOWNLOAD_FILE: 'downloadFile',
  START_INSTANCE: 'startInstance',
  STOP_INSTANCE: 'stopInstance',
  WRONG_FLAG: 'wrongFlag',
  CORRECT_FLAG: 'correctFlag',
  SOLVE_ROOM: 'solveRoom',
  UNLOCK_ROOM: 'unlockRoom',
  RESET_TEAM: 'resetTeam',
  RESET_MATCH: 'resetMatch',
  START_DEMO: 'startDemo',
  STOP_DEMO: 'stopDemo',
})

// Nama proses yang bisa disimulasikan dari Telemetry Simulator.
// Klasifikasinya (kategori/aktivitas) ditentukan backend, bukan frontend.
export const LAB_TOOL_PROCESSES = Object.freeze([
  'ghidra', 'gdb', 'radare2', 'strings', 'python3', 'openssl', 'hashcat', 'sage',
  'wireshark', 'tshark', 'volatility', 'burpsuite', 'firefox', 'pwntools',
])
