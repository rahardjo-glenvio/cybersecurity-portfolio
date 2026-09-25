import { randomUUID } from 'node:crypto'
import { ACTIVITY_STATE as S, EVENT_TYPES as E, LOBBY_ID, TELEMETRY_EVENTS } from '@lab/shared'
import {
  canEnter,
  createTeamProgress,
  findPath,
  forceUnlock,
  nextActivity,
  solveRoom,
  teamScore,
} from '@lab/game-engine'
import { describeEvent } from './eventText.js'

const MATCH_DURATION_MS = 2 * 60 * 60 * 1000
const TRANSIENT = new Set([S.ERROR, S.SUBMITTING, S.SUCCESS])

const ok = (events = [], extra = {}) => ({ ok: true, events, ...extra })
const fail = (reason, message) => ({ ok: false, reason, message: message ?? reason, events: [] })

// Source of truth di backend. Semua perubahan progression dan posisi lewat
// kelas ini: validasi -> progression engine -> database -> event bus.
export class GameState {
  constructor({ graph, mapConfig, db, ctf, bus, labMode }) {
    this.graph = graph
    this.mapConfig = mapConfig
    this.db = db
    this.ctf = ctf
    this.bus = bus
    this.labMode = labMode
    this.match = null
    this.teams = new Map()
    this.players = new Map()
    this.challenges = new Map()
    this.timers = new Map()
  }

  async init() {
    const [teams, players, challenges] = await Promise.all([
      this.ctf.getTeams(),
      this.ctf.getPlayers(),
      this.ctf.getChallenges(),
    ])
    this.challenges = new Map(challenges.map((c) => [c.id, c]))
    this.roomByChallenge = new Map([...this.graph.rooms.values()].map((r) => [r.challengeId, r.id]))
    this.db.saveMap(this.graph, this.mapConfig)

    for (const t of teams) {
      this.teams.set(t.id, { ...t, progress: createTeamProgress(this.graph), playerIds: [], instances: new Map(), attempts: {} })
      this.db.saveTeam(t)
    }
    for (const p of players) {
      const team = this.teams.get(p.teamId)
      if (!team) continue
      team.playerIds.push(p.id)
      this.players.set(p.id, { ...p, currentRoom: null, activityState: S.IDLE, lastActivity: null, tool: null })
      this.db.savePlayer(p)
    }

    // External event dari platform CTF (mis. solve lewat UI CTFd).
    this.ctf.subscribeToEvents((e) => this.handleCtfEvent(e))

    const active = this.db.getActiveMatch(this.graph.id)
    if (active) this.restore(active)
    else await this.startMatch()
  }

  // ---------- Match lifecycle ----------

  async startMatch() {
    for (const timer of this.timers.values()) clearTimeout(timer)
    this.timers.clear()
    const now = Date.now()
    this.match = {
      id: `match-${now}`,
      mapId: this.graph.id,
      name: `${this.graph.name} · LAB`,
      phase: 'RUNNING',
      startedAt: now,
      durationMs: MATCH_DURATION_MS,
    }
    this.db.startMatch(this.match)

    for (const team of this.teams.values()) {
      team.progress = createTeamProgress(this.graph)
      team.instances.clear()
      team.attempts = {}
      // Sinkron dengan solve yang sudah tercatat di platform CTF.
      const { solvedChallengeIds = [] } = await this.ctf.getTeamProgress(team.id)
      const solvedRooms = new Set(solvedChallengeIds.map((id) => this.roomByChallenge.get(id)).filter(Boolean))
      for (const roomId of this.graph.order) if (solvedRooms.has(roomId)) solveRoom(this.graph, team.progress, roomId)
      const positions = this.ctf.getInitialPositions?.(team.id) ?? {}
      for (const pid of team.playerIds) {
        const player = this.players.get(pid)
        const roomId = positions[pid]
        player.currentRoom = roomId && canEnter(team.progress, roomId) ? roomId : null
        player.activityState = player.currentRoom ? S.ACTIVE : S.IDLE
        player.lastActivity = player.currentRoom ? now : null
        player.tool = null
        this.db.savePosition(this.match.id, player)
      }
      this.persistProgress(team, { replace: true })
    }

    this.emit({ type: E.MATCH_STARTED, payload: { mapId: this.graph.id }, source: 'engine' })
    this.bus.touchAll()
    return ok()
  }

  restore(row) {
    this.match = {
      id: row.id,
      mapId: row.map_id,
      name: row.name,
      phase: row.phase,
      startedAt: row.started_at,
      durationMs: row.duration_ms,
    }
    for (const r of this.db.loadProgress(row.id)) {
      const team = this.teams.get(r.team_id)
      if (!team || !this.graph.rooms.has(r.room_id)) continue
      if (r.status !== 'LOCKED') team.progress.unlocked.add(r.room_id)
      if (r.status === 'SOLVED') {
        team.progress.solved.add(r.room_id)
        team.progress.solvedBy[r.room_id] = r.solved_by
      }
    }
    for (const r of this.db.loadPositions(row.id)) {
      const player = this.players.get(r.player_id)
      if (!player) continue
      player.currentRoom = r.room_id
      player.activityState = TRANSIENT.has(r.activity_state) ? S.ACTIVE : r.activity_state
      player.lastActivity = r.last_activity
    }
  }

  resetTeam(teamId) {
    const team = this.teams.get(teamId)
    if (!team) return fail('UNKNOWN_TEAM')
    team.progress = createTeamProgress(this.graph)
    team.instances.clear()
    team.attempts = {}
    for (const pid of team.playerIds) {
      const player = this.players.get(pid)
      this.clearTimer(pid)
      Object.assign(player, { currentRoom: null, activityState: S.IDLE, lastActivity: null, tool: null })
      this.db.savePosition(this.match.id, player)
    }
    this.persistProgress(team, { replace: true })
    return ok([this.emit({ type: E.LAB_TEAM_RESET, teamId, source: 'lab' })])
  }

  // ---------- Posisi player ----------

  enterRoom(playerId, roomId, source) {
    const player = this.players.get(playerId)
    if (!player) return fail('UNKNOWN_PLAYER')
    const team = this.teams.get(player.teamId)
    if (roomId !== LOBBY_ID && !this.graph.rooms.has(roomId)) return fail('UNKNOWN_ROOM')
    // Aturan utama: room LOCKED tidak bisa dimasuki.
    if (!canEnter(team.progress, roomId)) {
      return fail('LOCKED', `${this.graph.rooms.get(roomId).name} masih LOCKED untuk ${team.name}`)
    }
    const from = player.currentRoom ?? LOBBY_ID
    if (from === roomId) return ok()

    const path = findPath(this.graph, team.progress, from, roomId)
    const events = []
    if (player.currentRoom) {
      events.push(this.emit({ type: E.PLAYER_LEFT_ROOM, teamId: team.id, playerId, roomId: from, source }))
    }
    player.currentRoom = roomId === LOBBY_ID ? null : roomId
    this.setActivity(player, nextActivity(player.activityState, E.PLAYER_ENTERED_ROOM, { toolOpen: !!player.tool }))
    events.push(this.emit({ type: E.PLAYER_ENTERED_ROOM, teamId: team.id, playerId, roomId, payload: { from, path }, source }))
    return ok(events)
  }

  // ---------- Telemetry (hanya event non-progression) ----------

  applyTelemetry(event) {
    if (!TELEMETRY_EVENTS.includes(event.type)) return fail('FORBIDDEN_SOURCE', `${event.type} tidak boleh dari telemetry`)
    const player = this.players.get(event.playerId)
    if (!player || player.teamId !== event.teamId) return fail('UNKNOWN_PLAYER')

    const prev = player.activityState
    if (event.type === E.TOOL_OPENED) player.tool = event.payload
    if (event.type === E.TOOL_CLOSED && player.tool?.tool === event.payload?.tool) player.tool = null

    // Heartbeat aktif/idle tanpa perubahan state tidak perlu membanjiri feed.
    const quiet =
      (event.type === E.PLAYER_ACTIVE && prev !== S.IDLE && !event.payload?.activity) ||
      (event.type === E.PLAYER_IDLE && prev === S.IDLE)
    this.setActivity(player, nextActivity(prev, event.type, { toolOpen: !!player.tool }))
    if (quiet) return ok()

    return ok([
      this.emit({
        type: event.type,
        teamId: player.teamId,
        playerId: player.id,
        roomId: player.currentRoom ?? LOBBY_ID,
        payload: event.payload,
        source: 'telemetry',
      }),
    ])
  }

  // ---------- CTF engine: instance & flag ----------

  async setInstance(playerId, roomId, running) {
    const ctx = this.roomContext(playerId, roomId)
    if (!ctx.ok) return ctx
    const { player, team, room } = ctx
    const challenge = this.challenges.get(room.challengeId)
    if (!challenge?.instance) return fail('NO_INSTANCE', `${room.name} tidak punya instance`)
    if (running) {
      const { host } = await this.ctf.startInstance({ teamId: team.id, challengeId: room.challengeId })
      team.instances.set(room.id, { host, startedBy: player.id })
    } else {
      await this.ctf.stopInstance({ teamId: team.id, challengeId: room.challengeId })
      team.instances.delete(room.id)
    }
    const type = running ? E.INSTANCE_STARTED : E.INSTANCE_STOPPED
    if (running) this.setActivity(player, nextActivity(player.activityState, type, { toolOpen: !!player.tool }))
    return ok([this.emit({ type, teamId: team.id, playerId, roomId: room.id, source: 'ctf' })])
  }

  // Flag diverifikasi CTF engine; hanya hasil backend yang mengubah progression.
  async submitFlag(playerId, roomId, submission) {
    const ctx = this.roomContext(playerId, roomId)
    if (!ctx.ok) return ctx
    const { player, team, room } = ctx
    if (team.progress.solved.has(room.id)) return fail('ALREADY_SOLVED', `${room.name} sudah SOLVED`)

    const matchId = this.match.id
    team.attempts[room.id] = (team.attempts[room.id] ?? 0) + 1
    const events = []
    this.setActivity(player, nextActivity(player.activityState, E.FLAG_ATTEMPT))
    events.push(this.emit({ type: E.FLAG_ATTEMPT, teamId: team.id, playerId, roomId: room.id, payload: { attempt: team.attempts[room.id] }, source: 'ctf' }))

    const { correct } = await this.ctf.handleFlagSubmission({ teamId: team.id, playerId, challengeId: room.challengeId, submission })
    if (this.match.id !== matchId) return fail('MATCH_RESET')

    const type = correct ? E.FLAG_CORRECT : E.FLAG_WRONG
    this.setActivity(player, nextActivity(player.activityState, type, { toolOpen: !!player.tool }))
    events.push(this.emit({ type, teamId: team.id, playerId, roomId: room.id, source: 'ctf' }))
    if (correct) events.push(...this.applySolve(team, room.id, playerId, 'engine').events)
    return ok(events, { correct })
  }

  handleCtfEvent({ type, teamId, playerId, challengeId }) {
    const roomId = this.roomByChallenge.get(challengeId)
    const team = this.teams.get(teamId)
    if (!roomId || !team || type !== 'SOLVE') return
    const player = this.players.get(playerId)
    if (player) this.setActivity(player, nextActivity(player.activityState, E.FLAG_CORRECT))
    this.emit({ type: E.FLAG_CORRECT, teamId, playerId, roomId, source: 'ctf' })
    this.applySolve(team, roomId, playerId, 'engine')
  }

  // ---------- Progression (authoritative) ----------

  applySolve(team, roomId, playerId, source) {
    const result = solveRoom(this.graph, team.progress, roomId, { playerId })
    if (!result.ok) return fail(result.reason)
    this.persistProgress(team)
    const events = result.outcomes.map((o) =>
      this.emit({
        type: o.type,
        teamId: team.id,
        playerId: o.type === E.ROOM_SOLVED || o.type === E.CORE_BREACHED ? playerId : null,
        roomId: o.roomId,
        payload: o.points ? { points: o.points } : {},
        source,
      }),
    )
    return ok(events)
  }

  // Override LAB: hanya tersedia saat LAB_MODE aktif.
  labSolve(teamId, playerId, roomId) {
    if (!this.labMode) return fail('LAB_DISABLED')
    const team = this.teams.get(teamId)
    if (!team || !this.graph.rooms.has(roomId)) return fail('UNKNOWN_ROOM')
    return this.applySolve(team, roomId, playerId, 'lab')
  }

  labUnlock(teamId, roomId) {
    if (!this.labMode) return fail('LAB_DISABLED')
    const team = this.teams.get(teamId)
    if (!team) return fail('UNKNOWN_TEAM')
    const result = forceUnlock(this.graph, team.progress, roomId)
    if (!result.ok) return fail(result.reason)
    this.persistProgress(team)
    return ok(result.outcomes.map((o) => this.emit({ type: o.type, teamId, roomId: o.roomId, source: 'lab' })))
  }

  // ---------- Helpers ----------

  roomContext(playerId, roomId) {
    const player = this.players.get(playerId)
    if (!player) return fail('UNKNOWN_PLAYER')
    const team = this.teams.get(player.teamId)
    const id = roomId ?? player.currentRoom
    if (!id || id === LOBBY_ID) return fail('NO_ROOM', `${player.name} belum berada di room mana pun`)
    const room = this.graph.rooms.get(id)
    if (!room) return fail('UNKNOWN_ROOM')
    if (!canEnter(team.progress, id)) return fail('LOCKED', `${room.name} masih LOCKED untuk ${team.name}`)
    return { ok: true, player, team, room }
  }

  setActivity(player, transition) {
    this.clearTimer(player.id)
    player.activityState = transition.state
    player.lastActivity = Date.now()
    this.db.savePosition(this.match.id, player)
    if (transition.revertTo) {
      const timer = setTimeout(() => {
        this.timers.delete(player.id)
        player.activityState = transition.revertTo
        this.db.savePosition(this.match.id, player)
        this.bus.touch(player.teamId)
      }, transition.revertAfterMs)
      timer.unref?.()
      this.timers.set(player.id, timer)
    }
  }

  clearTimer(playerId) {
    clearTimeout(this.timers.get(playerId))
    this.timers.delete(playerId)
  }

  persistProgress(team, options) {
    const now = Date.now()
    const rows = this.graph.order.map((roomId) => ({
      roomId,
      status: team.progress.solved.has(roomId) ? 'SOLVED' : team.progress.unlocked.has(roomId) ? 'AVAILABLE' : 'LOCKED',
      unlockedAt: team.progress.unlocked.has(roomId) ? now : null,
      solvedAt: team.progress.solved.has(roomId) ? now : null,
      solvedBy: team.progress.solvedBy[roomId] ?? null,
    }))
    this.db.saveTeamProgress(this.match.id, team.id, rows, options)
    this.db.saveScore(team.id, teamScore(this.graph, team.progress))
  }

  emit({ type, teamId = null, playerId = null, roomId = null, payload = {}, source }) {
    const event = {
      eventId: `evt-${randomUUID()}`,
      matchId: this.match?.id ?? null,
      type,
      teamId,
      playerId,
      roomId,
      payload,
      source,
      lab: source === 'lab',
      timestamp: Date.now(),
    }
    event.summary = describeEvent(event, this)
    this.db.insertEvent(event)
    this.bus.publish(event)
    return event
  }
}
