import { useLab } from '../../state/store'
import { duration, useNow } from '../../lib/format'
import { Meta } from '../ui/primitives'

const CONNECTION_LABEL = { online: 'LIVE', offline: 'OFFLINE', connecting: 'CONNECTING' }

export default function TopBar() {
  const match = useLab((s) => s.match)
  const map = useLab((s) => s.map)
  const connection = useLab((s) => s.connection)
  const lab = useLab((s) => s.lab)
  const teamId = useLab((s) => s.teamId)
  const teams = useLab((s) => s.teams)
  const closeTeam = useLab((s) => s.closeTeam)
  const now = useNow(1000)
  const team = teams.find((t) => t.id === teamId)
  const remaining = match ? match.startedAt + match.durationMs - now : 0

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand__mark" aria-hidden="true" />
        <div>
          <strong>CTF Progression LAB</strong>
          <span>Player activity tracking</span>
        </div>
      </div>

      <nav className="crumbs" aria-label="Navigasi">
        <button type="button" className={teamId ? '' : 'is-active'} onClick={closeTeam}>
          Overview
        </button>
        {teamId && (
          <>
            <span aria-hidden="true">/</span>
            <strong style={{ color: team?.color }}>{team?.name ?? teamId}</strong>
          </>
        )}
      </nav>

      <div className="topbar__meta">
        <Meta label="Map" value={map?.name ?? '—'} />
        <Meta label="Phase" value={match?.phase ?? '—'} />
        <Meta label="Time left" value={duration(remaining)} mono />
        <span className={`conn conn--${connection}`}>
          <span className="dot" />
          {CONNECTION_LABEL[connection]}
        </span>
        {lab && (
          <span className="lab-badge" title="Event mock diizinkan. Jangan dipakai untuk kompetisi sungguhan.">
            LAB MODE
          </span>
        )}
      </div>
    </header>
  )
}
