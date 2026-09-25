import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'

const SCHEMA = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')

// Repository tipis di atas node:sqlite (bawaan Node, tanpa native build).
export function openDatabase(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')
  db.exec(SCHEMA)

  const q = (sql) => db.prepare(sql)
  const s = {
    upsertMap: q(`INSERT INTO maps (id, name, version, config_json) VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, version = excluded.version, config_json = excluded.config_json`),
    deleteRooms: q('DELETE FROM rooms WHERE map_id = ?'),
    insertRoom: q(`INSERT INTO rooms (map_id, id, name, category, stage, points, room_type, requires, challenge_id, pos_x, pos_y, pos_z)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
    insertDep: q('INSERT INTO room_dependencies (map_id, room_id, requires_room_id) VALUES (?, ?, ?)'),
    upsertTeam: q(`INSERT INTO teams (id, name, color, score) VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, color = excluded.color`),
    updateScore: q('UPDATE teams SET score = ? WHERE id = ?'),
    upsertPlayer: q(`INSERT INTO players (id, team_id, name, color) VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET team_id = excluded.team_id, name = excluded.name, color = excluded.color`),
    endMatches: q(`UPDATE matches SET phase = 'ENDED', ended_at = ? WHERE phase = 'RUNNING'`),
    insertMatch: q('INSERT INTO matches (id, map_id, name, phase, started_at, duration_ms) VALUES (?, ?, ?, ?, ?, ?)'),
    activeMatch: q(`SELECT * FROM matches WHERE phase = 'RUNNING' AND map_id = ? ORDER BY started_at DESC LIMIT 1`),
    upsertProgress: q(`INSERT INTO team_room_progress (match_id, team_id, room_id, status, unlocked_at, solved_at, solved_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(match_id, team_id, room_id) DO UPDATE SET status = excluded.status,
        unlocked_at = COALESCE(team_room_progress.unlocked_at, excluded.unlocked_at),
        solved_at = excluded.solved_at, solved_by = excluded.solved_by`),
    deleteTeamProgress: q('DELETE FROM team_room_progress WHERE match_id = ? AND team_id = ?'),
    progressForMatch: q('SELECT * FROM team_room_progress WHERE match_id = ?'),
    upsertPosition: q(`INSERT INTO player_positions (match_id, player_id, room_id, activity_state, last_activity)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(match_id, player_id) DO UPDATE SET room_id = excluded.room_id,
        activity_state = excluded.activity_state, last_activity = excluded.last_activity`),
    positionsForMatch: q('SELECT * FROM player_positions WHERE match_id = ?'),
    insertEvent: q(`INSERT INTO events (event_id, match_id, type, team_id, player_id, room_id, source, lab, payload_json, summary, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
    recentEvents: q('SELECT * FROM events WHERE match_id = ? ORDER BY timestamp DESC, rowid DESC LIMIT ?'),
    recentTeamEvents: q('SELECT * FROM events WHERE match_id = ? AND team_id = ? ORDER BY timestamp DESC, rowid DESC LIMIT ?'),
  }

  const transaction = (fn) => {
    db.exec('BEGIN')
    try {
      const result = fn()
      db.exec('COMMIT')
      return result
    } catch (err) {
      db.exec('ROLLBACK')
      throw err
    }
  }

  return {
    raw: db,
    transaction,
    close: () => db.close(),

    saveMap(graph, config) {
      transaction(() => {
        s.upsertMap.run(graph.id, graph.name, graph.version, JSON.stringify(config))
        s.deleteRooms.run(graph.id)
        for (const id of graph.order) {
          const r = graph.rooms.get(id)
          const [x, y, z] = r.position3D ?? [0, 0, 0]
          s.insertRoom.run(graph.id, r.id, r.name, r.category ?? null, r.stage ?? null, r.points ?? 0, r.type, r.requires, r.challengeId ?? null, x, y, z)
          for (const pre of r.prerequisites) s.insertDep.run(graph.id, r.id, pre)
        }
      })
    },
    saveTeam: (t) => s.upsertTeam.run(t.id, t.name, t.color ?? null, 0),
    saveScore: (teamId, score) => s.updateScore.run(score, teamId),
    savePlayer: (p) => s.upsertPlayer.run(p.id, p.teamId, p.name, p.color ?? null),
    startMatch(match) {
      transaction(() => {
        s.endMatches.run(Date.now())
        s.insertMatch.run(match.id, match.mapId, match.name, match.phase, match.startedAt, match.durationMs)
      })
    },
    getActiveMatch: (mapId) => s.activeMatch.get(mapId),
    saveTeamProgress(matchId, teamId, rows, { replace = false } = {}) {
      transaction(() => {
        if (replace) s.deleteTeamProgress.run(matchId, teamId)
        for (const r of rows) {
          s.upsertProgress.run(matchId, teamId, r.roomId, r.status, r.unlockedAt ?? null, r.solvedAt ?? null, r.solvedBy ?? null)
        }
      })
    },
    loadProgress: (matchId) => s.progressForMatch.all(matchId),
    savePosition: (matchId, p) =>
      s.upsertPosition.run(matchId, p.id, p.currentRoom ?? null, p.activityState, p.lastActivity ?? null),
    loadPositions: (matchId) => s.positionsForMatch.all(matchId),
    insertEvent: (e) =>
      s.insertEvent.run(
        e.eventId, e.matchId, e.type, e.teamId ?? null, e.playerId ?? null, e.roomId ?? null,
        e.source, e.lab ? 1 : 0, JSON.stringify(e.payload ?? {}), e.summary ?? null, e.timestamp,
      ),
    recentEvents(matchId, { teamId, limit = 40 } = {}) {
      const rows = teamId ? s.recentTeamEvents.all(matchId, teamId, limit) : s.recentEvents.all(matchId, limit)
      return rows.map((r) => ({
        eventId: r.event_id,
        matchId: r.match_id,
        type: r.type,
        teamId: r.team_id,
        playerId: r.player_id,
        roomId: r.room_id,
        source: r.source,
        lab: !!r.lab,
        payload: JSON.parse(r.payload_json || '{}'),
        summary: r.summary,
        timestamp: r.timestamp,
      }))
    },
  }
}
