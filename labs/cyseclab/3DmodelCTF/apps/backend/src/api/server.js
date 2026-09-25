import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import { LAB_COMMANDS, WS_MESSAGE as WS } from '@lab/shared'
import { toPublicEvent } from '../core/eventText.js'
import { matchInfo, overview, roomDetail, teamSnapshot } from '../core/viewModel.js'

// HTTP + WebSocket. Frontend hanya membaca proyeksi (viewModel) dan
// semantic event publik; perintah LAB lewat REST dan divalidasi backend.
export async function createServer({ state, lab, bus, config }) {
  const app = Fastify({ logger: { level: config.logLevel } })
  await app.register(websocket)

  const clients = new Set()
  const send = (socket, message) => {
    if (socket.readyState === 1) socket.send(JSON.stringify(message))
  }
  const overviewMessage = () => ({ type: WS.OVERVIEW, match: matchInfo(state), teams: overview(state) })

  bus.on('event', (event) => {
    const message = { type: WS.EVENT, event: toPublicEvent(event) }
    for (const c of clients) send(c.socket, message)
  })

  bus.on('teams', (changed) => {
    const ov = overviewMessage()
    for (const c of clients) {
      send(c.socket, ov)
      if (c.teamId && (changed.has('*') || changed.has(c.teamId))) {
        send(c.socket, { type: WS.TEAM, team: teamSnapshot(state, c.teamId) })
      }
    }
  })

  app.get('/ws', { websocket: true }, (socket) => {
    const client = { socket, teamId: null }
    clients.add(client)
    send(socket, {
      type: WS.HELLO,
      lab: config.labMode,
      match: matchInfo(state),
      map: { id: state.graph.id, name: state.graph.name, rooms: state.graph.order.length },
      recent: state.db.recentEvents(state.match.id, { limit: 40 }).map(toPublicEvent),
    })
    send(socket, overviewMessage())

    socket.on('message', (data) => {
      let msg
      try {
        msg = JSON.parse(String(data))
      } catch {
        return
      }
      if (msg.type === WS.SUBSCRIBE) {
        client.teamId = state.teams.has(msg.teamId) ? msg.teamId : null
        if (client.teamId) send(socket, { type: WS.TEAM, team: teamSnapshot(state, client.teamId) })
      }
    })
    socket.on('close', () => clients.delete(client))
  })

  app.get('/api/health', async () => ({ ok: true, lab: config.labMode, clients: clients.size }))

  app.get('/api/state', async () => ({
    lab: config.labMode,
    match: matchInfo(state),
    map: { id: state.graph.id, name: state.graph.name },
    teams: overview(state),
  }))

  app.get('/api/teams', async () => overview(state))

  app.get('/api/teams/:teamId', async (req, reply) => {
    const snapshot = teamSnapshot(state, req.params.teamId)
    return snapshot ?? reply.code(404).send({ error: 'Team tidak ditemukan' })
  })

  // Room LOCKED -> 403 dengan { id, status } saja.
  app.get('/api/teams/:teamId/rooms/:roomId', async (req, reply) => {
    const detail = roomDetail(state, req.params.teamId, req.params.roomId)
    if (!detail) return reply.code(404).send({ error: 'Room tidak ditemukan' })
    return detail.status === 'LOCKED' ? reply.code(403).send(detail) : detail
  })

  app.get('/api/events', async (req) => {
    const limit = Math.min(200, Number(req.query.limit) || 50)
    return state.db.recentEvents(state.match.id, { teamId: req.query.teamId, limit }).map(toPublicEvent)
  })

  // ---- LAB MODE: mock events. Di produksi endpoint ini tidak didaftarkan. ----
  if (config.labMode) {
    app.post(
      '/api/lab/command',
      {
        schema: {
          body: {
            type: 'object',
            required: ['command'],
            properties: {
              command: { enum: Object.values(LAB_COMMANDS) },
              teamId: { type: 'string', maxLength: 64 },
              playerId: { type: 'string', maxLength: 64 },
              roomId: { type: 'string', maxLength: 64 },
              tool: { type: 'string', maxLength: 32 },
            },
            additionalProperties: false,
          },
        },
      },
      async (req, reply) => {
        const result = await lab.run(req.body)
        const body = {
          ok: result.ok,
          reason: result.reason,
          message: result.message,
          raw: result.raw,
          events: (result.events ?? []).map(toPublicEvent),
        }
        return result.ok ? body : reply.code(409).send(body)
      },
    )
  }

  return app
}
