const EVENT_LIMIT = 1000

// Pengganti SQLite untuk mode standalone (browser). Data hidup selama halaman
// terbuka, jadi tidak ada match yang perlu di-restore: hanya event log yang
// disimpan (untuk feed awal client), tulisan lain diabaikan.
// Antarmukanya sama dengan openDatabase() di database.js.
export function openMemoryDatabase() {
  const events = []
  const noop = () => {}

  return {
    close: noop,
    saveMap: noop,
    saveTeam: noop,
    saveScore: noop,
    savePlayer: noop,
    startMatch: noop,
    getActiveMatch: () => null,
    saveTeamProgress: noop,
    loadProgress: () => [],
    savePosition: noop,
    loadPositions: () => [],
    insertEvent(event) {
      events.unshift({ ...event })
      if (events.length > EVENT_LIMIT) events.length = EVENT_LIMIT
    },
    recentEvents(matchId, { teamId, limit = 40 } = {}) {
      return events.filter((e) => e.matchId === matchId && (!teamId || e.teamId === teamId)).slice(0, limit)
    },
  }
}
