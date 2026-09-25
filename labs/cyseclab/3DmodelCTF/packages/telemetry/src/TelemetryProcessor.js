import { ACTIVITY_KIND, EVENT_TYPES as E, TELEMETRY_EVENTS } from '@lab/shared'
import { RAW_KINDS } from './TelemetryAdapter.js'
import { classifyProcess } from './toolCatalog.js'

// Field yang tidak boleh pernah keluar dari layer telemetry, walaupun
// agent (salah konfigurasi) mengirimkannya.
export const SENSITIVE_FIELDS = Object.freeze([
  'cmdline', 'args', 'argv', 'command', 'keystrokes', 'keys', 'clipboard', 'screenshot',
  'content', 'contents', 'password', 'passwd', 'credential', 'credentials', 'token', 'env',
  'path', 'cwd', 'user', 'username', 'body', 'flag',
])

const ALLOWED_RAW = ['source', 'vmId', 'teamId', 'playerId', 'kind', 'process', 'file', 'net', 'idleSeconds', 'timestamp']
const IDLE_THRESHOLD_S = 120
const WEB_THROTTLE_MS = 10_000

// Whitelist: hanya field yang dikenal yang dibaca; sisanya dibuang.
export function sanitizeRaw(raw) {
  const clean = {}
  for (const key of ALLOWED_RAW) if (raw[key] !== undefined) clean[key] = raw[key]
  if (clean.file) {
    clean.file = {
      name: String(clean.file.name ?? '').split(/[\\/]/).pop().slice(0, 120),
      sizeBytes: Number(clean.file.sizeBytes) || 0,
      origin: clean.file.origin,
    }
  }
  if (clean.net) clean.net = { dstHost: String(clean.net.dstHost ?? ''), dstPort: Number(clean.net.dstPort) || 0 }
  return clean
}

// Raw telemetry -> semantic game event. Visualisasi hanya menerima hasil ini.
export class TelemetryProcessor {
  constructor({ challengeHosts = [] } = {}) {
    this.challengeHosts = new Set(challengeHosts)
    this.lastWebActivity = new Map()
  }

  process(input) {
    const raw = sanitizeRaw(input)
    const base = { teamId: raw.teamId, playerId: raw.playerId, timestamp: raw.timestamp ?? Date.now() }
    const events = []

    switch (raw.kind) {
      case RAW_KINDS.PROCESS_STARTED:
      case RAW_KINDS.PROCESS_EXITED: {
        const tool = classifyProcess(raw.process)
        if (!tool) break // proses non-kompetisi: diabaikan
        events.push({
          ...base,
          type: raw.kind === RAW_KINDS.PROCESS_STARTED ? E.TOOL_OPENED : E.TOOL_CLOSED,
          payload: { tool: tool.tool, label: tool.label, category: tool.category, activity: tool.activity },
        })
        break
      }
      case RAW_KINDS.FILE_CREATED:
        // Hanya unduhan dari platform CTF; file pribadi tidak dilacak.
        if (raw.file?.origin === 'ctf-platform' && raw.file.name) {
          events.push({ ...base, type: E.FILE_DOWNLOADED, payload: { fileName: raw.file.name, sizeBytes: raw.file.sizeBytes } })
        }
        break
      case RAW_KINDS.NET_FLOW: {
        if (!this.challengeHosts.has(raw.net?.dstHost)) break
        const last = this.lastWebActivity.get(raw.playerId)
        if (last !== undefined && base.timestamp - last < WEB_THROTTLE_MS) break
        this.lastWebActivity.set(raw.playerId, base.timestamp)
        events.push({ ...base, type: E.PLAYER_ACTIVE, payload: { activity: ACTIVITY_KIND.WEB } })
        break
      }
      case RAW_KINDS.INPUT_ACTIVITY: {
        const idle = Number(raw.idleSeconds) || 0
        events.push({ ...base, type: idle >= IDLE_THRESHOLD_S ? E.PLAYER_IDLE : E.PLAYER_ACTIVE, payload: { idleSeconds: idle } })
        break
      }
      default:
        break
    }

    // Pertahanan berlapis: telemetry tidak pernah menghasilkan event progression.
    return events.filter((e) => TELEMETRY_EVENTS.includes(e.type))
  }
}
