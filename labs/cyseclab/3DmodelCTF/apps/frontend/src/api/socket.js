import { EVENT_TYPES, WS_MESSAGE as WS } from '@lab/shared'
import { useLab } from '../state/store'
import { eventStream } from '../lib/eventStream'

let socket = null
let retry = 0
let started = false

function send(message) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
}

function handle(msg) {
  const store = useLab.getState()
  switch (msg.type) {
    case WS.HELLO:
      store.applyHello(msg)
      break
    case WS.OVERVIEW:
      store.applyOverview(msg)
      break
    case WS.TEAM:
      store.applyTeam(msg.team)
      break
    case WS.EVENT: {
      const event = msg.event
      store.pushEvent(event)
      // Efek 3D hanya untuk tim yang sedang dibuka.
      if (event.teamId === store.teamId || event.type === EVENT_TYPES.MATCH_STARTED) eventStream.emit(event)
      break
    }
    default:
      break
  }
}

function connect() {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
  socket = new WebSocket(`${protocol}://${location.host}/ws`)
  socket.onopen = () => {
    retry = 0
    useLab.getState().setConnection('online')
    send({ type: WS.SUBSCRIBE, teamId: useLab.getState().teamId })
  }
  socket.onmessage = (m) => {
    try {
      handle(JSON.parse(m.data))
    } catch (err) {
      console.error('[ws]', err)
    }
  }
  socket.onclose = () => {
    useLab.getState().setConnection('offline')
    setTimeout(connect, Math.min(5000, 400 * 2 ** retry++))
  }
}

export function startSocket() {
  if (started) return
  started = true
  connect()
  useLab.subscribe((s, prev) => {
    if (s.teamId !== prev.teamId) send({ type: WS.SUBSCRIBE, teamId: s.teamId })
  })
}
