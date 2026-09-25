import { useState } from 'react'
import { LAB_COMMANDS as C, LAB_TOOL_PROCESSES } from '@lab/shared'
import { useLab } from '../../state/store'
import { api } from '../../api/client'

const GROUPS = [
  {
    label: 'Posisi & aktivitas (telemetry)',
    actions: [
      [C.ENTER_ROOM, 'Enter Room'],
      [C.SET_ACTIVE, 'Set Active'],
      [C.SET_IDLE, 'Set Idle'],
      [C.OPEN_TOOL, 'Open Tool'],
      [C.DOWNLOAD_FILE, 'Download File'],
      [C.START_INSTANCE, 'Start Instance'],
    ],
  },
  {
    label: 'CTF engine (diverifikasi backend)',
    actions: [
      [C.WRONG_FLAG, 'Wrong Flag', 'danger'],
      [C.CORRECT_FLAG, 'Correct Flag', 'success'],
    ],
  },
  {
    label: 'Override LAB',
    actions: [
      [C.SOLVE_ROOM, 'Solve Room'],
      [C.UNLOCK_ROOM, 'Unlock Room'],
      [C.RESET_TEAM, 'Reset Team', 'warn'],
      [C.RESET_MATCH, 'Reset Match', 'warn'],
    ],
  },
]

// Telemetry Simulator + debug panel. Semua aksi lewat backend: frontend tidak
// bisa langsung menandai room solved; backend tetap memvalidasi dependency.
export default function LabPanel({ team }) {
  const teams = useLab((s) => s.teams)
  const openTeam = useLab((s) => s.openTeam)
  const labOpen = useLab((s) => s.labOpen)
  const toggleLab = useLab((s) => s.toggleLab)
  const showNotice = useLab((s) => s.showNotice)
  const demoRunning = useLab((s) => s.demoRunning)
  const setDemoRunning = useLab((s) => s.setDemoRunning)
  const selectedRoomId = useLab((s) => s.selectedRoomId)

  const [playerId, setPlayerId] = useState(team.players[0].id)
  const [roomChoice, setRoomChoice] = useState('')
  const [tool, setTool] = useState('ghidra')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)

  const player = team.players.find((p) => p.id === playerId) ?? team.players[0]
  // Default room: pilihan manual > room terpilih di 3D > posisi player.
  const roomId = roomChoice || selectedRoomId || (player.currentRoom !== 'lobby' ? player.currentRoom : '')

  async function run(command) {
    setBusy(true)
    const res = await api.labCommand({
      command,
      teamId: team.id,
      playerId: player.id,
      ...(roomId ? { roomId } : {}),
      tool,
    })
    setBusy(false)
    setResult({ command, ...res.data })
    if (!res.ok) showNotice({ level: 'warn', message: res.data.message ?? res.data.reason ?? 'Ditolak backend' })
    if (command === C.START_DEMO && res.ok) setDemoRunning(true)
    if ((command === C.STOP_DEMO || command === C.RESET_MATCH) && res.ok) setDemoRunning(false)
  }

  return (
    <section className={`lab-panel${labOpen ? '' : ' is-collapsed'}`} aria-label="LAB control panel">
      <header className="lab-panel__head">
        <button type="button" className="lab-panel__toggle" onClick={toggleLab} aria-expanded={labOpen}>
          <span className="lab-badge">LAB MODE</span>
          Telemetry Simulator & Debug
          <span className="lab-panel__chev">{labOpen ? '▾' : '▴'}</span>
        </button>
        <span className="lab-panel__warn">Mock event. Produksi wajib diverifikasi CTF engine.</span>
      </header>

      {labOpen && (
        <div className="lab-panel__body">
          <div className="lab-fields">
            <label>
              <span>Team</span>
              <select id="lab-team" className="select" value={team.id} onChange={(e) => openTeam(e.target.value)}>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="lab-field">
              <span>Player</span>
              <div className="segmented">
                {team.players.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={p.id === player.id ? 'is-active' : ''}
                    style={{ '--player': p.color }}
                    onClick={() => setPlayerId(p.id)}
                  >
                    <span className="player-dot" style={{ background: p.color }} />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            <label>
              <span>Room</span>
              <select id="lab-room" className="select" value={roomId} onChange={(e) => setRoomChoice(e.target.value)}>
                <option value="">(posisi player)</option>
                {team.rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name ?? r.id} · {r.status}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Tool (raw process)</span>
              <select id="lab-tool" className="select" value={tool} onChange={(e) => setTool(e.target.value)}>
                {LAB_TOOL_PROCESSES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="lab-actions">
            {GROUPS.map((g) => (
              <div key={g.label} className="lab-group">
                <span className="lab-group__label">{g.label}</span>
                <div className="lab-group__buttons">
                  {g.actions.map(([command, label, tone]) => (
                    <button
                      key={command}
                      type="button"
                      className={`btn btn--sm${tone ? ` btn--${tone}` : ''}`}
                      disabled={busy}
                      onClick={() => run(command)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="lab-group">
              <span className="lab-group__label">Skenario</span>
              <div className="lab-group__buttons">
                <button
                  type="button"
                  className={`btn btn--sm${demoRunning ? ' btn--on' : ' btn--accent'}`}
                  onClick={() => run(demoRunning ? C.STOP_DEMO : C.START_DEMO)}
                >
                  {demoRunning ? 'Stop Demo' : 'Auto Demo'}
                </button>
              </div>
            </div>
          </div>

          <div className="lab-result" aria-live="polite">
            {result ? (
              <>
                <div>
                  <span className="lab-group__label">Raw telemetry</span>
                  <pre>{result.raw ? JSON.stringify(result.raw, null, 1) : '— (bukan dari telemetry)'}</pre>
                </div>
                <div>
                  <span className="lab-group__label">Semantic event ({result.ok ? 'OK' : result.reason})</span>
                  <pre>{result.events?.length ? result.events.map((e) => `${e.type}${e.roomId ? ` · ${e.roomId}` : ''}`).join('\n') : result.message ?? '—'}</pre>
                </div>
              </>
            ) : (
              <p>Pilih player dan room, lalu kirim event. Hasil transformasi raw → semantic tampil di sini.</p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
