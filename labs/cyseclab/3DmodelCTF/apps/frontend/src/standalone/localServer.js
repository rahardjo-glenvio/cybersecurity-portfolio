import { MockTelemetryAdapter } from '@lab/telemetry'
import mapConfig from '../../../backend/maps/old-town.json'
import ctfData from '../../../backend/src/adapters/ctf/mock/ctf-data.json'
import { MockCTFEngineAdapter } from '../../../backend/src/adapters/ctf/MockCTFEngineAdapter.js'
import { createCore } from '../../../backend/src/core/createCore.js'
import { openMemoryDatabase } from '../../../backend/src/db/memoryDatabase.js'
import { createFeed, labCommandResponse, roomResponse } from '../../../backend/src/api/protocol.js'

// Mode standalone: core backend LAB berjalan di tab ini, tanpa server.
// Dipakai untuk demo statis. State hilang saat reload dan tidak dibagi antar
// viewer; flag mock ikut ter-bundle, jadi jangan dipakai untuk kompetisi.
const ready = createCore({
  mapConfig,
  db: openMemoryDatabase(),
  ctf: new MockCTFEngineAdapter({ data: ctfData }),
  telemetry: new MockTelemetryAdapter(),
  labMode: true,
}).then((core) => ({ ...core, feed: createFeed({ ...core, labMode: true }) }))

// Salin lewat JSON supaya client menerima data persis seperti dari jaringan.
const wire = (value) => JSON.parse(JSON.stringify(value))
const toResponse = ({ status, body }) => ({ ok: status < 400, status, data: wire(body) })

export async function connect(onMessage) {
  const { feed } = await ready
  return feed.connect((message) => onMessage(wire(message)))
}

export async function labCommand(body) {
  const { lab } = await ready
  return toResponse(await labCommandResponse(lab, body))
}

export async function room(teamId, roomId) {
  const { state } = await ready
  return toResponse(roomResponse(state, teamId, roomId))
}
