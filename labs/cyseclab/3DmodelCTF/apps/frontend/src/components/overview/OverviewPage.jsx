import { useLab } from '../../state/store'
import { ActivityPill } from '../ui/primitives'
import ActivityFeed from '../team/ActivityFeed'

// Overview sengaja tanpa 3D: skala ke 50 tim tetap ringan.
// 3D building hanya dirender untuk tim yang dibuka.
export default function OverviewPage() {
  const teams = useLab((s) => s.teams)
  const openTeam = useLab((s) => s.openTeam)
  const sorted = [...teams].sort((a, b) => b.score - a.score || b.solvedCount - a.solvedCount)

  return (
    <main className="overview">
      <section className="overview__main">
        <header className="section-head">
          <span className="eyebrow">Overview · {teams.length} tim</span>
          <h1>Team progression</h1>
          <p>Klik tim untuk membuka 3D Team Battle View. Progression dihitung backend dan dikirim lewat WebSocket.</p>
        </header>
        <div className="team-grid">
          {sorted.map((team, i) => (
            <TeamCard key={team.id} team={team} rank={i + 1} onOpen={() => openTeam(team.id)} />
          ))}
        </div>
      </section>
      <aside className="overview__side">
        <ActivityFeed />
      </aside>
    </main>
  )
}

function TeamCard({ team, rank, onOpen }) {
  const segments = Array.from({ length: team.totalRooms }, (_, i) =>
    i < team.solvedCount ? 'solved' : i < team.unlockedCount ? 'open' : 'locked',
  )
  return (
    <button type="button" className="team-card" style={{ '--team': team.color }} onClick={onOpen}>
      <div className="team-card__head">
        <span className="team-card__rank">#{rank}</span>
        <strong>{team.name}</strong>
        {team.coreBreached && <span className="breach">CORE BREACHED</span>}
        <span className="team-card__score">{team.score}<small> pts</small></span>
      </div>
      <div className="segments" aria-label={`${team.solvedCount} dari ${team.totalRooms} room solved`}>
        {segments.map((s, i) => (
          <span key={i} className={`segment segment--${s}`} />
        ))}
      </div>
      <div className="team-card__meta">
        {team.solvedCount} / {team.totalRooms} rooms solved · {team.unlockedCount - team.solvedCount} available
      </div>
      <ul className="mini-players">
        {team.players.map((p) => (
          <li key={p.id}>
            <span className="player-dot" style={{ background: p.color }} />
            <strong>{p.name}</strong>
            <span className="mini-players__room">{p.currentRoomName}</span>
            <ActivityPill state={p.activityState} />
          </li>
        ))}
      </ul>
    </button>
  )
}
