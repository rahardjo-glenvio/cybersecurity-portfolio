import { CTFEngineAdapter, notImplemented } from './CTFEngineAdapter.js'

/**
 * PLACEHOLDER integrasi CTFd (REST API v1). Rencana pemetaan:
 *   getTeams()             GET  /api/v1/teams
 *   getPlayers()           GET  /api/v1/teams/{id}/members  -> /api/v1/users/{id}
 *   getChallenges()        GET  /api/v1/challenges (+ /api/v1/challenges/{id}, /files)
 *   getTeamProgress(id)    GET  /api/v1/teams/{id}/solves
 *   handleFlagSubmission   POST /api/v1/challenges/attempt  (session/token milik player)
 *   subscribeToEvents      polling /api/v1/submissions?type=correct atau plugin CTFd
 *                          yang mengirim webhook saat solve.
 * Map room -> challenge memakai field `challengeId` di map JSON.
 * Header: Authorization: Token <admin token>, Content-Type: application/json.
 */
export class CTFdAdapter extends CTFEngineAdapter {
  constructor({ baseUrl, apiToken } = {}) {
    super('ctfd')
    this.baseUrl = baseUrl
    this.apiToken = apiToken
  }

  async init() {
    throw notImplemented(this, 'init (set CTF_ADAPTER=mock untuk LAB)')
  }
}
