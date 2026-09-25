/**
 * Kontrak antara Progression Engine dan platform CTF (CTFd, platform custom, mock).
 * Visualisasi dan progression tidak pernah memanggil API CTFd langsung:
 * cukup ganti implementasi adapter ini.
 *
 * Bentuk data:
 *   Team      { id, name, color }
 *   Player    { id, teamId, name, color }
 *   Challenge { id, title, category, points, description, files: [{name, size}],
 *               hint, instance: { host, port } | null }   // hanya di backend
 */
export class CTFEngineAdapter {
  constructor(name) {
    this.name = name
  }

  async init() {}

  /** @returns {Promise<Array<{id, name, color}>>} */
  async getTeams() {
    throw notImplemented(this, 'getTeams')
  }

  /** @returns {Promise<Array<{id, teamId, name, color}>>} */
  async getPlayers() {
    throw notImplemented(this, 'getPlayers')
  }

  /** Data lengkap challenge, TIDAK pernah dikirim utuh ke frontend. */
  async getChallenges() {
    throw notImplemented(this, 'getChallenges')
  }

  /** Solve yang sudah tercatat di platform CTF (dipakai saat match dimulai / sinkronisasi). */
  async getTeamProgress(teamId) {
    throw notImplemented(this, `getTeamProgress(${teamId})`)
  }

  /**
   * Verifikasi flag dilakukan platform CTF, bukan frontend.
   * @returns {Promise<{ correct: boolean }>}
   */
  async handleFlagSubmission({ teamId, playerId, challengeId, submission }) {
    void teamId, playerId, challengeId, submission
    throw notImplemented(this, 'handleFlagSubmission')
  }

  /**
   * Event dari platform CTF (misalnya solve lewat UI CTFd).
   * callback({ type: 'SOLVE' | 'INSTANCE_STARTED' | 'INSTANCE_STOPPED', teamId, playerId, challengeId })
   * @returns {() => void} unsubscribe
   */
  subscribeToEvents(callback) {
    void callback
    return () => {}
  }

  // Opsional: manajemen instance challenge (challenge server / orchestrator).
  async startInstance({ teamId, challengeId }) {
    void teamId, challengeId
    throw notImplemented(this, 'startInstance')
  }

  async stopInstance({ teamId, challengeId }) {
    void teamId, challengeId
    throw notImplemented(this, 'stopInstance')
  }
}

export function notImplemented(adapter, method) {
  return new Error(`${adapter.name}: ${method} belum diimplementasikan`)
}
