// Auto Demo membaca skenario dari map JSON (field "demo"), jadi map lain
// bisa punya demo sendiri tanpa mengubah kode.
export class DemoRunner {
  constructor({ lab, state, script = [] }) {
    this.lab = lab
    this.state = state
    this.script = script
    this.token = null
  }

  get running() {
    return !!this.token
  }

  start(teamId) {
    const team = this.state.teams.get(teamId)
    if (!team) return { ok: false, reason: 'UNKNOWN_TEAM', message: 'Pilih tim untuk demo' }
    if (!this.script.length) return { ok: false, reason: 'NO_SCRIPT', message: 'Map ini tidak punya skenario demo' }
    this.stop()
    const token = { cancelled: false }
    this.token = token
    this.loop(team, token).finally(() => {
      if (this.token === token) this.token = null
    })
    return { ok: true, events: [], message: `Auto Demo berjalan untuk ${team.name}` }
  }

  stop() {
    if (this.token) this.token.cancelled = true
    this.token = null
    return { ok: true, events: [] }
  }

  async loop(team, token) {
    for (const step of this.script) {
      await new Promise((r) => setTimeout(r, step.wait ?? 1000))
      if (token.cancelled) return
      const playerId = step.player !== undefined ? team.playerIds[step.player] : undefined
      try {
        await this.lab.run({ ...step, teamId: team.id, playerId })
      } catch (err) {
        console.error('[demo]', err)
      }
    }
  }
}
