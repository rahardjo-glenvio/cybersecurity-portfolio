async function request(url, options) {
  const res = await fetch(url, options)
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

export const api = {
  // LAB MODE: mock event lewat backend (tetap divalidasi server).
  labCommand: (body) =>
    request('/api/lab/command', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  // Room LOCKED -> 403 berisi { id, status } saja.
  room: (teamId, roomId) => request(`/api/teams/${encodeURIComponent(teamId)}/rooms/${encodeURIComponent(roomId)}`),
}
