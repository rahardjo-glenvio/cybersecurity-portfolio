import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import { LAB_COMMANDS } from '@lab/shared'
import { toPublicEvent } from '../core/eventText.js'
import { matchInfo, overview, teamSnapshot } from '../core/viewModel.js'
import { createFeed, labCommandResponse, roomResponse } from './protocol.js'

// HTTP + WebSocket. Frontend hanya membaca proyeksi (viewModel) dan
// semantic event publik; perintah LAB lewat REST dan divalidasi backend.
export async function createServer({ state, lab, bus, config }) {
  const app = Fastify({ logger: { level: config.logLevel } })
  await app.register(websocket)

  const feed = createFeed({ state, bus, labMode: config.labMode })

  app.get('/ws', { websocket: true }, (socket) => {
    const client = feed.connect((message) => {
      if (socket.readyState === 1) socket.send(JSON.stringify(message))
    })
    socket.on('message', (data) => {
      let msg
      try {
        msg = JSON.parse(String(data))
      } catch {
        return
      }
      client.receive(msg)
    })
    socket.on('close', client.close)
  })

  app.get('/api/health', async () => ({ ok: true, lab: config.labMode, clients: feed.size }))

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

  app.get('/api/teams/:teamId/rooms/:roomId', async (req, reply) => {
    const { status, body } = roomResponse(state, req.params.teamId, req.params.roomId)
    return reply.code(status).send(body)
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
        const { status, body } = await labCommandResponse(lab, req.body)
        return reply.code(status).send(body)
      },
    )
  }

  return app
}
