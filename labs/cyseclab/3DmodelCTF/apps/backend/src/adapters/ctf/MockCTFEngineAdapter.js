import { createHash, timingSafeEqual } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { CTFEngineAdapter } from './CTFEngineAdapter.js'

const DATA_URL = new URL('./mock/ctf-data.json', import.meta.url)
const sha256 = (value) => createHash('sha256').update(String(value)).digest()

// Pengganti CTFd untuk LAB. Flag disimpan sebagai hash; plaintext hanya
// dipakai tombol "Correct Flag" di LAB lewat getLabFlag().
export class MockCTFEngineAdapter extends CTFEngineAdapter {
  constructor({ latencyMs = 350, dataUrl = DATA_URL } = {}) {
    super('mock-ctf')
    this.latencyMs = latencyMs
    this.dataUrl = dataUrl
  }

  async init() {
    const data = JSON.parse(readFileSync(this.dataUrl, 'utf8'))
    this.teams = data.teams
    this.players = data.teams.flatMap((team) =>
      data.playerTemplate.map((p) => ({
        id: `player-${team.id.split('-')[1]}-${p.suffix}`,
        teamId: team.id,
        name: p.name,
        color: p.color,
      })),
    )
    this.challenges = Object.entries(data.challenges).map(([id, c]) => ({ id, ...c }))
    this.flagHashes = new Map(this.challenges.map((c) => [c.id, sha256(c.flag)]))
    this.labFlags = new Map(this.challenges.map((c) => [c.id, c.flag]))
    for (const c of this.challenges) delete c.flag
    this.seed = data.seed ?? {}
  }

  async getTeams() {
    return this.teams
  }

  async getPlayers() {
    return this.players
  }

  async getChallenges() {
    return this.challenges
  }

  async getTeamProgress(teamId) {
    return { solvedChallengeIds: this.seed[teamId]?.solved ?? [] }
  }

  async handleFlagSubmission({ challengeId, submission }) {
    await new Promise((r) => setTimeout(r, this.latencyMs))
    const expected = this.flagHashes.get(challengeId)
    if (!expected) return { correct: false }
    return { correct: timingSafeEqual(expected, sha256(submission)) }
  }

  async startInstance({ challengeId }) {
    const c = this.challenges.find((ch) => ch.id === challengeId)
    if (!c?.instance) throw new Error('Challenge ini tidak punya instance')
    return { host: `${c.instance.host}:${c.instance.port}` }
  }

  async stopInstance() {
    return { stopped: true }
  }

  // ---- Khusus LAB ----

  getLabFlag(challengeId) {
    return this.labFlags.get(challengeId)
  }

  getInitialPositions(teamId) {
    return this.seed[teamId]?.positions ?? {}
  }
}
