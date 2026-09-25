import { LAB_COMMANDS as C, LOBBY_ID } from '@lab/shared'
import { RAW_KINDS } from '@lab/telemetry'

// Perintah debug panel / Telemetry Simulator. Hanya aktif di LAB_MODE.
// Aksi aktivitas VM dikirim sebagai RAW telemetry melalui MockTelemetryAdapter
// supaya jalurnya sama dengan produksi (raw -> processor -> semantic event).
export class LabController {
  constructor({ state, telemetry, ctf }) {
    this.state = state
    this.telemetry = telemetry
    this.ctf = ctf
    this.demo = null
  }

  async run(cmd) {
    const { state } = this
    const player = cmd.playerId ? state.players.get(cmd.playerId) : null
    const teamId = cmd.teamId ?? player?.teamId
    if (player && player.teamId !== teamId) return { ok: false, reason: 'TEAM_MISMATCH', message: 'Player bukan anggota tim ini' }
    const raw = (fields) => this.injectRaw({ teamId, playerId: cmd.playerId, ...fields })

    switch (cmd.command) {
      case C.ENTER_ROOM:
        return state.enterRoom(cmd.playerId, cmd.roomId ?? LOBBY_ID, 'lab')
      case C.SET_ACTIVE:
        return raw({ kind: RAW_KINDS.INPUT_ACTIVITY, idleSeconds: 0 })
      case C.SET_IDLE:
        return raw({ kind: RAW_KINDS.INPUT_ACTIVITY, idleSeconds: 300 })
      case C.OPEN_TOOL:
        return raw({ kind: RAW_KINDS.PROCESS_STARTED, process: cmd.tool ?? 'ghidra' })
      case C.CLOSE_TOOL:
        return raw({ kind: RAW_KINDS.PROCESS_EXITED, process: player?.tool?.tool ?? cmd.tool ?? 'ghidra' })
      case C.DOWNLOAD_FILE: {
        const ctx = state.roomContext(cmd.playerId, cmd.roomId)
        if (!ctx.ok) return ctx
        const file = state.challenges.get(ctx.room.challengeId)?.files?.[0]
        if (!file) return { ok: false, reason: 'NO_FILE', message: `${ctx.room.name} tidak punya file` }
        return raw({ kind: RAW_KINDS.FILE_CREATED, file: { name: file.name, sizeBytes: 1024, origin: 'ctf-platform' } })
      }
      case C.START_INSTANCE:
        return state.setInstance(cmd.playerId, cmd.roomId, true)
      case C.STOP_INSTANCE:
        return state.setInstance(cmd.playerId, cmd.roomId, false)
      case C.WRONG_FLAG:
        return state.submitFlag(cmd.playerId, cmd.roomId, 'LAB{definitely_wrong}')
      case C.CORRECT_FLAG: {
        const ctx = state.roomContext(cmd.playerId, cmd.roomId)
        if (!ctx.ok) return ctx
        // Flag benar diambil server-side dari mock CTF engine, tidak pernah dari frontend.
        const flag = this.ctf.getLabFlag?.(ctx.room.challengeId)
        if (!flag) return { ok: false, reason: 'UNSUPPORTED', message: 'Adapter CTF ini tidak menyediakan flag LAB' }
        return state.submitFlag(cmd.playerId, ctx.room.id, flag)
      }
      case C.SOLVE_ROOM:
        return state.labSolve(teamId, cmd.playerId ?? null, cmd.roomId ?? player?.currentRoom)
      case C.UNLOCK_ROOM:
        return state.labUnlock(teamId, cmd.roomId)
      case C.RESET_TEAM:
        return state.resetTeam(teamId)
      case C.RESET_MATCH:
        this.demo?.stop()
        return state.startMatch()
      case C.START_DEMO:
        return this.demo.start(teamId)
      case C.STOP_DEMO:
        return this.demo.stop()
      default:
        return { ok: false, reason: 'UNKNOWN_COMMAND', message: `Command tidak dikenal: ${cmd.command}` }
    }
  }

  injectRaw(rawEvent) {
    if (!this.telemetry.inject) return { ok: false, reason: 'UNSUPPORTED', message: 'Telemetry adapter bukan mock' }
    const results = this.telemetry.inject(rawEvent)
    const failed = results.find((r) => !r.ok)
    if (failed) return failed
    return { ok: true, raw: rawEvent, events: results.flatMap((r) => r.events) }
  }
}
