import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { MockTelemetryAdapter } from '@lab/telemetry'
import { createCore } from '../src/core/createCore.js'
import { createFeed, labCommandResponse, roomResponse } from '../src/api/protocol.js'
import { openMemoryDatabase } from '../src/db/memoryDatabase.js'
import { MockCTFEngineAdapter } from '../src/adapters/ctf/MockCTFEngineAdapter.js'

const json = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))

// Rakitan yang sama dengan mode standalone di browser: tanpa SQLite dan HTTP.
test('mode standalone: core + memory DB + feed berjalan tanpa server', async () => {
  const core = await createCore({
    mapConfig: json('../maps/old-town.json'),
    db: openMemoryDatabase(),
    ctf: new MockCTFEngineAdapter({ data: json('../src/adapters/ctf/mock/ctf-data.json'), latencyMs: 0 }),
    telemetry: new MockTelemetryAdapter(),
    labMode: true,
  })
  const messages = []
  const client = createFeed({ ...core, labMode: true }).connect((m) => messages.push(m))
  assert.deepEqual(messages.map((m) => m.type), ['hello', 'overview'])
  client.receive({ type: 'subscribe', teamId: 'team-01' })
  assert.equal(messages.at(-1).type, 'team')

  const cmd = (command) => labCommandResponse(core.lab, { teamId: 'team-01', playerId: 'player-01-a', ...command })
  await cmd({ command: 'enterRoom', roomId: 'town-gate' })
  const wrong = await cmd({ command: 'wrongFlag' })
  assert.ok(wrong.body.events.some((e) => e.type === 'FLAG_WRONG'))
  const { status, body } = await cmd({ command: 'correctFlag' })
  assert.equal(status, 200)
  assert.ok(body.events.some((e) => e.type === 'ROOM_SOLVED' && e.roomId === 'town-gate'))
  assert.ok(messages.some((m) => m.type === 'event' && m.event.type === 'FLAG_CORRECT'))

  // Snapshot tim dikirim ulang setelah batch event.
  await new Promise((r) => setImmediate(r))
  const team = messages.findLast((m) => m.type === 'team').team
  assert.equal(team.rooms.find((r) => r.id === 'town-gate').status, 'SOLVED')

  assert.equal(roomResponse(core.state, 'team-01', 'guild-hall').status, 403)
  assert.equal(roomResponse(core.state, 'team-01', 'ghost').status, 404)
  assert.equal((await cmd({ command: 'enterRoom', roomId: 'old-town-core' })).status, 409)
})
