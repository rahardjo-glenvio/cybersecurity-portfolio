import { create } from 'zustand'

const FEED_LIMIT = 80
const hashTeam = () => decodeURIComponent(location.hash.replace('#', '')) || null

// Frame yang dibatasi (mis. embed Artifact) bisa menolak history API;
// navigasi tetap jalan, hanya URL yang tidak ikut berubah.
function setUrl(url) {
  try {
    history.replaceState(null, '', url)
  } catch {
    // abaikan
  }
}

// State UI saja. Progression, status room, dan posisi player selalu datang
// dari backend (snapshot WebSocket); frontend tidak menghitungnya sendiri.
export const useLab = create((set, get) => ({
  connection: 'connecting',
  lab: false,
  match: null,
  map: null,
  teams: [],
  teamId: hashTeam(),
  team: null,
  feed: [],
  selectedRoomId: null,
  notice: null,
  labOpen: true,
  bloom: true,
  viewResetSeq: 0,
  demoRunning: false,

  setConnection: (connection) => set({ connection }),
  applyHello: (msg) => set({ lab: msg.lab, match: msg.match, map: msg.map, feed: msg.recent ?? [] }),
  applyOverview: (msg) => set({ teams: msg.teams, match: msg.match }),
  applyTeam: (team) => {
    if (team?.id === get().teamId) set({ team })
  },
  pushEvent: (event) => set((s) => ({ feed: [event, ...s.feed].slice(0, FEED_LIMIT) })),

  openTeam: (teamId) => {
    set({ teamId, team: null, selectedRoomId: null })
    setUrl(`#${teamId}`)
  },
  closeTeam: () => {
    set({ teamId: null, team: null, selectedRoomId: null })
    setUrl(location.pathname)
  },
  selectRoom: (selectedRoomId) => set({ selectedRoomId }),
  showNotice: (notice) => set({ notice: { ...notice, id: Date.now() } }),
  clearNotice: () => set({ notice: null }),
  toggleLab: () => set((s) => ({ labOpen: !s.labOpen })),
  setBloom: (bloom) => set({ bloom }),
  resetView: () => set((s) => ({ viewResetSeq: s.viewResetSeq + 1, selectedRoomId: null })),
  setDemoRunning: (demoRunning) => set({ demoRunning }),
}))
