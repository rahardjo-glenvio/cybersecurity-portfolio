import { CTFEngineAdapter } from './CTFEngineAdapter.js'

const sha256 = async (value) =>
  new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value))))

// Perbandingan waktu-konstan untuk dua digest SHA-256.
function digestEqual(a, b) {
  let diff = a.length ^ b.length
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

// Pengganti CTFd untuk LAB. Flag disimpan sebagai hash; plaintext hanya
// dipakai tombol "Correct Flag" di LAB lewat getLabFlag().
// Tanpa node:fs/node:crypto supaya juga jalan di browser (mode standalone):
// data dikirim pemanggil (server Node membacanya dari mock/ctf-data.json).
export class MockCTFEngineAdapter extends CTFEngineAdapter {
  constructor({ data, latencyMs = 350 } = {}) {
    super('mock-ctf')
    if (!data) throw new Error('MockCTFEngineAdapter butuh data mock')
    this.data = data
    this.latencyMs = latencyMs
  }

  async init() {
    const { data } = this
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
    this.flagHashes = new Map(await Promise.all(this.challenges.map(async (c) => [c.id, await sha256(c.flag)])))
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
    return { correct: digestEqual(expected, await sha256(submission)) }
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
