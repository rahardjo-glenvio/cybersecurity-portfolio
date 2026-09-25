import { useLab } from '../../state/store'
import { ACTIVITY_COLOR } from '../../config/theme'
import { ago, useNow } from '../../lib/format'
import { ActivityPill, StatusPill } from '../ui/primitives'
import ProgressGraph from './ProgressGraph'

export default function TeamPanel({ team }) {
  const selectRoom = useLab((s) => s.selectRoom)
  const selectedRoomId = useLab((s) => s.selectedRoomId)
  const now = useNow(5000)
  const progress = team.solvedCount / team.totalRooms

  return (
    <aside className="left-panel">
      <section className="team-head" style={{ '--team': team.color }}>
        <span className="eyebrow">Team</span>
        <h2>{team.name}</h2>
        <div className="team-head__stats">
          <div>
            <strong>{team.score}</strong>
            <span>score</span>
          </div>
          <div>
            <strong>
              {team.solvedCount}/{team.totalRooms}
            </strong>
            <span>rooms solved</span>
          </div>
        </div>
        <div className="bar">
          <span style={{ width: `${Math.max(2, progress * 100)}%` }} />
        </div>
        {team.coreBreached && <div className="breach breach--block">CORE BREACHED</div>}
      </section>

      <section className="panel-section">
        <span className="eyebrow">Players · posisi milik player</span>
        <ul className="player-list">
          {team.players.map((p) => (
            <li key={p.id} style={{ '--player': p.color, '--act': ACTIVITY_COLOR[p.activityState] }}>
              <span className="player-dot player-dot--lg" style={{ background: p.color }} />
              <div className="player-list__body">
                <div className="player-list__top">
                  <strong>{p.name}</strong>
                  <ActivityPill state={p.activityState} />
                </div>
                <span className="player-list__room">{p.currentRoomName}</span>
                <span className="player-list__sub">
                  {p.tool ? `${p.tool.label} · ` : ''}
                  {ago(p.lastActivity, now)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel-section">
        <span className="eyebrow">Progression graph · milik tim</span>
        <ProgressGraph team={team} />
      </section>

      <section className="panel-section">
        <span className="eyebrow">Rooms</span>
        <ul className="room-list">
          {team.rooms.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className={r.id === selectedRoomId ? 'is-selected' : ''}
                onClick={() => selectRoom(r.id === selectedRoomId ? null : r.id)}
              >
                <span className="room-list__name">{r.name ?? r.id}</span>
                <span className="room-list__pts">{r.points ? `${r.points}` : '···'}</span>
                <StatusPill status={r.status} />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}
