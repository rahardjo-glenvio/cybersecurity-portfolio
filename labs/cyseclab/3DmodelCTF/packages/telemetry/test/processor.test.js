import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MockTelemetryAdapter, TelemetryProcessor, SENSITIVE_FIELDS } from '../src/index.js'

const who = { teamId: 'team-01', playerId: 'player-01-a' }

test('PROCESS_STARTED ghidra -> TOOL_OPENED reverse-engineering', () => {
  const p = new TelemetryProcessor()
  const [e] = p.process({ ...who, kind: 'PROCESS_STARTED', process: '/opt/ghidra/ghidra' })
  assert.equal(e.type, 'TOOL_OPENED')
  assert.deepEqual(e.payload, { tool: 'ghidra', label: 'Ghidra', category: 'reverse-engineering', activity: 'REVERSING_ACTIVITY' })
})

test('field sensitif tidak pernah keluar dari processor', () => {
  const p = new TelemetryProcessor()
  const events = p.process({
    ...who,
    kind: 'PROCESS_STARTED',
    process: 'python3',
    cmdline: 'python3 solve.py --password hunter2',
    keystrokes: 'abc',
    clipboard: 'secret',
    env: { AWS_KEY: 'x' },
  })
  const json = JSON.stringify(events)
  for (const field of SENSITIVE_FIELDS) assert.ok(!json.includes(`"${field}"`), `bocor: ${field}`)
  assert.ok(!json.includes('hunter2'))
})

test('proses non-kompetisi dan file pribadi diabaikan', () => {
  const p = new TelemetryProcessor()
  assert.deepEqual(p.process({ ...who, kind: 'PROCESS_STARTED', process: 'spotify' }), [])
  assert.deepEqual(p.process({ ...who, kind: 'FILE_CREATED', file: { name: 'CV.pdf', origin: 'local' } }), [])
})

test('file dari platform CTF hanya membawa nama file (tanpa path)', () => {
  const p = new TelemetryProcessor()
  const [e] = p.process({ ...who, kind: 'FILE_CREATED', file: { name: 'C:/Users/x/Downloads/gate.zip', sizeBytes: 10, origin: 'ctf-platform' } })
  assert.deepEqual(e.payload, { fileName: 'gate.zip', sizeBytes: 10 })
})

test('idle hanya dari durasi, bukan keystroke', () => {
  const p = new TelemetryProcessor()
  assert.equal(p.process({ ...who, kind: 'INPUT_ACTIVITY', idleSeconds: 300 })[0].type, 'PLAYER_IDLE')
  assert.equal(p.process({ ...who, kind: 'INPUT_ACTIVITY', idleSeconds: 3 })[0].type, 'PLAYER_ACTIVE')
})

test('traffic ke challenge host -> WEB_ACTIVITY (dengan throttle)', () => {
  const p = new TelemetryProcessor({ challengeHosts: ['town-gate.lab'] })
  const raw = { ...who, kind: 'NET_FLOW', net: { dstHost: 'town-gate.lab', dstPort: 443 }, timestamp: 1000 }
  assert.equal(p.process(raw)[0].payload.activity, 'WEB_ACTIVITY')
  assert.deepEqual(p.process({ ...raw, timestamp: 2000 }), [])
  assert.deepEqual(p.process({ ...raw, net: { dstHost: 'youtube.com' }, timestamp: 50_000 }), [])
})

test('mock adapter meneruskan raw ke listener dan mengembalikan hasilnya', async () => {
  const adapter = new MockTelemetryAdapter()
  const processor = new TelemetryProcessor()
  adapter.onEvent((raw) => processor.process(raw))
  await adapter.start()
  const out = adapter.inject({ ...who, kind: 'PROCESS_STARTED', process: 'wireshark' })
  assert.equal(out[0].payload.activity, 'FORENSICS_ACTIVITY')
})
