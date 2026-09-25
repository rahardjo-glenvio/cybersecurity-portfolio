import { useEffect } from 'react'
import { useLab } from './state/store'
import { startSocket } from './api/socket'
import TopBar from './components/layout/TopBar'
import Toast from './components/layout/Toast'
import OverviewPage from './components/overview/OverviewPage'
import TeamView from './components/team/TeamView'

export default function App() {
  const teamId = useLab((s) => s.teamId)
  useEffect(() => startSocket(), [])

  return (
    <div className="shell">
      <TopBar />
      {teamId ? <TeamView key={teamId} /> : <OverviewPage />}
      <Toast />
    </div>
  )
}
