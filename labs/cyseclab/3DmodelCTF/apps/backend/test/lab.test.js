import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createLab } from '../src/app.js'
import { roomDetail, teamSnapshot } from '../src/core/viewModel.js'

let lab
const run = (cmd) => lab.lab.run({ teamId: 'team-01', ...cmd })
const status = (teamId, roomId) => teamSnapshot(lab.state, teamId).rooms.find((r) => r.id === roomId).status

before(async () => {
  lab = await createLab({
    dbPath: ':memory:',
    mapPath: fileURLToPath(new URL('../maps/old-town.json', import.meta.url)),
    ctfAdapter: 'mock',
    ctfOptions: { latencyMs: 0 },
    telemetryAdapter: 'mock',
    labMode: true,
    http: false,
  })
})

after(() => lab.close())

test('player tidak bisa masuk room LOCKED', async () => {
  const r = await run({ command: 'enterRoom', playerId: 'player-01-a', roomId: 'guild-hall' })
  assert.equal(r.ok, false)
  assert.equal(r.reason, 'LOCKED')
})

test('room LOCKED tidak membocorkan metadata challenge', () => {
  const locked = teamSnapshot(lab.state, 'team-01').rooms.find((r) => r.id === 'guild-hall')
  assert.equal(locked.status, 'LOCKED')
  assert.equal(locked.category, undefined)
  assert.equal(locked.points, undefined)
  assert.deepEqual(roomDetail(lab.state, 'team-01', 'guild-hall'), { id: 'guild-hall', status: 'LOCKED' })
})

test('detail room unlocked tidak pernah berisi flag atau isi hint', () => {
  const json = JSON.stringify(roomDetail(lab.state, 'team-01', 'town-gate'))
  assert.ok(!json.includes('LAB{'))
  assert.ok(!json.includes('session divalidasi'))
})

test('enter room tidak memindahkan player lain, room jadi ACTIVE', async () => {
  const r = await run({ command: 'enterRoom', playerId: 'player-01-a', roomId: 'town-gate' })
  assert.ok(r.ok)
  assert.deepEqual(r.events.map((e) => e.type), ['PLAYER_ENTERED_ROOM'])
  assert.deepEqual(r.events[0].payload.path, ['lobby', 'town-gate'])
  assert.equal(status('team-01', 'town-gate'), 'ACTIVE')
  assert.equal(lab.state.players.get('player-01-b').currentRoom, null)
})

test('telemetry raw -> semantic: Ghidra membuat player ANALYZING', async () => {
  const r = await run({ command: 'openTool', playerId: 'player-01-a', tool: 'ghidra' })
  assert.equal(r.events[0].type, 'TOOL_OPENED')
  assert.equal(r.events[0].payload.activity, 'REVERSING_ACTIVITY')
  assert.equal(lab.state.players.get('player-01-a').activityState, 'ANALYZING')
})

test('flag salah -> ERROR, progression tidak berubah', async () => {
  const r = await run({ command: 'wrongFlag', playerId: 'player-01-a' })
  assert.deepEqual(r.events.map((e) => e.type), ['FLAG_ATTEMPT', 'FLAG_WRONG'])
  assert.equal(lab.state.players.get('player-01-a').activityState, 'ERROR')
  assert.equal(status('team-01', 'town-gate'), 'ACTIVE')
})

test('solve Town Gate + Belfry membuka Guild Hall, tim lain tidak berubah', async () => {
  const before = JSON.stringify(teamSnapshot(lab.state, 'team-05').rooms)
  await run({ command: 'correctFlag', playerId: 'player-01-a' })
  assert.equal(status('team-01', 'town-gate'), 'SOLVED')
  assert.equal(status('team-01', 'guild-hall'), 'LOCKED')

  await run({ command: 'enterRoom', playerId: 'player-01-b', roomId: 'belfry' })
  const r = await run({ command: 'correctFlag', playerId: 'player-01-b' })
  const types = r.events.map((e) => `${e.type}:${e.roomId}`)
  assert.ok(types.includes('ROOM_UNLOCKED:guild-hall'))
  assert.ok(types.includes('ROOM_UNLOCKED:telegraph-office'))
  assert.equal(status('team-01', 'guild-hall'), 'AVAILABLE')
  assert.equal(JSON.stringify(teamSnapshot(lab.state, 'team-05').rooms), before)
})

test('unlock tidak memindahkan player otomatis', () => {
  assert.equal(lab.state.players.get('player-01-a').currentRoom, 'town-gate')
})

test('telemetry tidak bisa mengirim event progression', () => {
  const r = lab.state.applyTelemetry({ type: 'ROOM_SOLVED', teamId: 'team-01', playerId: 'player-01-a', roomId: 'guild-hall' })
  assert.equal(r.reason, 'FORBIDDEN_SOURCE')
  assert.equal(status('team-01', 'guild-hall'), 'AVAILABLE')
})

test('semua event tersimpan di SQLite', () => {
  const rows = lab.db.recentEvents(lab.state.match.id, { teamId: 'team-01', limit: 100 })
  assert.ok(rows.some((e) => e.type === 'ROOM_UNLOCKED'))
  assert.ok(rows.every((e) => !JSON.stringify(e.payload).includes('LAB{')))
})
