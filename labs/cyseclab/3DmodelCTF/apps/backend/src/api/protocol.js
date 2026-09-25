import { WS_MESSAGE as WS } from '@lab/shared'
import { toPublicEvent } from '../core/eventText.js'
import { matchInfo, overview, roomDetail, teamSnapshot } from '../core/viewModel.js'

// Bentuk pesan dan respons ke client. Dipakai server Fastify dan transport
// lokal mode standalone, jadi keduanya selalu identik.

const overviewMessage = (state) => ({ type: WS.OVERVIEW, match: matchInfo(state), teams: overview(state) })
const teamMessage = (state, teamId) => ({ type: WS.TEAM, team: teamSnapshot(state, teamId) })

// Menghubungkan event bus ke client. `send` menerima objek pesan;
// transport (WebSocket atau lokal) yang menentukan cara mengirimnya.
export function createFeed({ state, bus, labMode }) {
  const clients = new Set()

  bus.on('event', (event) => {
    const message = { type: WS.EVENT, event: toPublicEvent(event) }
    for (const c of clients) c.send(message)
  })

  bus.on('teams', (changed) => {
    const ov = overviewMessage(state)
    for (const c of clients) {
      c.send(ov)
      if (c.teamId && (changed.has('*') || changed.has(c.teamId))) c.send(teamMessage(state, c.teamId))
    }
  })

  return {
    get size() {
      return clients.size
    },
    connect(send) {
      const client = { send, teamId: null }
      clients.add(client)
      send({
        type: WS.HELLO,
        lab: labMode,
        match: matchInfo(state),
        map: { id: state.graph.id, name: state.graph.name, rooms: state.graph.order.length },
        recent: state.db.recentEvents(state.match.id, { limit: 40 }).map(toPublicEvent),
      })
      send(overviewMessage(state))
      return {
        receive(msg) {
          if (msg?.type !== WS.SUBSCRIBE) return
          client.teamId = state.teams.has(msg.teamId) ? msg.teamId : null
          if (client.teamId) send(teamMessage(state, client.teamId))
        },
        close: () => clients.delete(client),
      }
    },
  }
}

// Room LOCKED -> 403 dengan { id, status } saja.
export function roomResponse(state, teamId, roomId) {
  const detail = roomDetail(state, teamId, roomId)
  if (!detail) return { status: 404, body: { error: 'Room tidak ditemukan' } }
  return { status: detail.status === 'LOCKED' ? 403 : 200, body: detail }
}

export async function labCommandResponse(lab, command) {
  const result = await lab.run(command)
  return {
    status: result.ok ? 200 : 409,
    body: {
      ok: result.ok,
      reason: result.reason,
      message: result.message,
      raw: result.raw,
      events: (result.events ?? []).map(toPublicEvent),
    },
  }
}
