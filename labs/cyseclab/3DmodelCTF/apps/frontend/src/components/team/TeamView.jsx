import { useLab } from '../../state/store'
import FacilityCanvas from '../scene/FacilityCanvas'
import TeamPanel from './TeamPanel'
import RoomDetail from './RoomDetail'
import ActivityFeed from './ActivityFeed'
import StageOverlay from './StageOverlay'
import LabPanel from '../lab/LabPanel'

// 3D Team Battle View: kiri info tim, tengah building 3D, kanan feed + detail room.
export default function TeamView() {
  const team = useLab((s) => s.team)
  const teamId = useLab((s) => s.teamId)
  const lab = useLab((s) => s.lab)

  if (!team) {
    return (
      <main className="team-view team-view--loading">
        <p>Memuat {teamId}…</p>
      </main>
    )
  }

  return (
    <main className="team-view">
      <TeamPanel team={team} />
      <section className="stage">
        <div className="stage__view">
          <FacilityCanvas />
          <StageOverlay />
        </div>
        {lab && <LabPanel team={team} />}
      </section>
      <aside className="side-panel">
        <RoomDetail team={team} />
        <ActivityFeed teamId={team.id} />
      </aside>
    </main>
  )
}
