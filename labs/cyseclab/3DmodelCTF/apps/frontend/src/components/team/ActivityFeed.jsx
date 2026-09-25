import { useState } from 'react'
import { useLab } from '../../state/store'
import { eventTone } from '../../config/theme'
import { clock } from '../../lib/format'
import { Toggle } from '../ui/primitives'

// Battle feed: kalimat dibuat backend (tanpa flag, jawaban, command, exploit).
export default function ActivityFeed({ teamId = null }) {
  const feed = useLab((s) => s.feed)
  const [onlyTeam, setOnlyTeam] = useState(false)
  const items = onlyTeam && teamId ? feed.filter((e) => e.teamId === teamId) : feed

  return (
    <section className="panel-section feed-panel">
      <header className="panel-section__head">
        <span className="eyebrow">Live activity</span>
        {teamId && <Toggle id="feed-only-team" label="Tim ini saja" checked={onlyTeam} onChange={setOnlyTeam} />}
      </header>
      <ol className="feed">
        {items.slice(0, 50).map((e) => (
          <li key={e.eventId} className={teamId && e.teamId === teamId ? 'is-own' : ''} style={{ '--tone': eventTone(e.type) }}>
            <time>{clock(e.timestamp)}</time>
            <span className="feed__text">{e.summary}</span>
            {e.lab && e.source === 'lab' && <span className="tag">LAB</span>}
          </li>
        ))}
        {!items.length && <li className="feed__empty">Belum ada aktivitas.</li>}
      </ol>
    </section>
  )
}
