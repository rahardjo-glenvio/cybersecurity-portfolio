import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMapGraph, createTeamProgress, solveRoom, roomStatus, canEnter, findPath, forceUnlock, MapConfigError } from '../src/index.js'

// Map generik (bukan Old Town) untuk membuktikan engine tidak di-hardcode.
const DIAMOND = {
  id: 'diamond',
  rooms: [
    { id: 'a', points: 100 },
    { id: 'b', points: 100 },
    { id: 'c', prerequisites: ['a', 'b'], points: 200 },
    { id: 'd', prerequisites: ['a'], points: 200 },
    { id: 'x', prerequisites: ['c', 'd'], requires: 'any', points: 50 },
    { id: 'core', type: 'core', prerequisites: ['c', 'd'], points: 500 },
  ],
  links: [['a', 'b']],
}

test('room tanpa prerequisite langsung AVAILABLE, lainnya LOCKED', () => {
  const g = createMapGraph(DIAMOND)
  const p = createTeamProgress(g)
  assert.equal(roomStatus(p, 'a'), 'AVAILABLE')
  assert.equal(roomStatus(p, 'b'), 'AVAILABLE')
  assert.equal(roomStatus(p, 'c'), 'LOCKED')
  assert.equal(canEnter(p, 'c'), false)
})

test('requires all: c terbuka hanya setelah a DAN b solved', () => {
  const g = createMapGraph(DIAMOND)
  const p = createTeamProgress(g)
  const first = solveRoom(g, p, 'a')
  assert.deepEqual(first.outcomes.map((o) => `${o.type}:${o.roomId}`), ['ROOM_SOLVED:a', 'ROOM_UNLOCKED:d'])
  assert.equal(roomStatus(p, 'c'), 'LOCKED')
  const second = solveRoom(g, p, 'b')
  assert.ok(second.outcomes.some((o) => o.type === 'ROOM_UNLOCKED' && o.roomId === 'c'))
})

test('requires any: x terbuka setelah salah satu prerequisite solved', () => {
  const g = createMapGraph(DIAMOND)
  const p = createTeamProgress(g)
  solveRoom(g, p, 'a')
  const r = solveRoom(g, p, 'd')
  assert.ok(r.outcomes.some((o) => o.roomId === 'x' && o.type === 'ROOM_UNLOCKED'))
})

test('core menghasilkan CORE_UNLOCKED lalu CORE_BREACHED', () => {
  const g = createMapGraph(DIAMOND)
  const p = createTeamProgress(g)
  for (const id of ['a', 'b', 'd']) solveRoom(g, p, id)
  const unlock = solveRoom(g, p, 'c')
  assert.ok(unlock.outcomes.some((o) => o.type === 'CORE_UNLOCKED'))
  const breach = solveRoom(g, p, 'core')
  assert.ok(breach.outcomes.some((o) => o.type === 'CORE_BREACHED'))
})

test('room LOCKED tidak bisa di-solve', () => {
  const g = createMapGraph(DIAMOND)
  const p = createTeamProgress(g)
  assert.deepEqual(solveRoom(g, p, 'core'), { ok: false, reason: 'LOCKED' })
})

test('progress antar tim terpisah', () => {
  const g = createMapGraph(DIAMOND)
  const alpha = createTeamProgress(g)
  const bravo = createTeamProgress(g)
  solveRoom(g, alpha, 'a')
  assert.equal(roomStatus(alpha, 'a'), 'SOLVED')
  assert.equal(roomStatus(bravo, 'a'), 'AVAILABLE')
})

test('ACTIVE hanya jika ada player tim di room unlocked', () => {
  const g = createMapGraph(DIAMOND)
  const p = createTeamProgress(g)
  assert.equal(roomStatus(p, 'a', new Set(['a'])), 'ACTIVE')
  assert.equal(roomStatus(p, 'c', new Set(['c'])), 'LOCKED')
})

test('findPath hanya lewat room yang bisa diakses', () => {
  const g = createMapGraph(DIAMOND)
  const p = createTeamProgress(g)
  solveRoom(g, p, 'a')
  assert.deepEqual(findPath(g, p, null, 'd'), ['lobby', 'a', 'd'])
  assert.deepEqual(findPath(g, p, 'b', 'd'), ['b', 'a', 'd'])
})

test('forceUnlock (LAB) membuka room tanpa prerequisite', () => {
  const g = createMapGraph(DIAMOND)
  const p = createTeamProgress(g)
  const r = forceUnlock(g, p, 'core')
  assert.deepEqual(r.outcomes.map((o) => o.type), ['ROOM_UNLOCKED', 'CORE_UNLOCKED'])
})

test('validasi config: siklus dan prerequisite hilang ditolak', () => {
  assert.throws(() => createMapGraph({ id: 'x', rooms: [{ id: 'a', prerequisites: ['b'] }, { id: 'b', prerequisites: ['a'] }] }), MapConfigError)
  assert.throws(() => createMapGraph({ id: 'x', rooms: [{ id: 'a', prerequisites: ['ghost'] }] }), MapConfigError)
})
