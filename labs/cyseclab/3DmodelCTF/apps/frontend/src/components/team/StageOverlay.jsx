import { useEffect, useState } from 'react'
import { EVENT_TYPES as E } from '@lab/shared'
import { useLab } from '../../state/store'
import { eventStream } from '../../lib/eventStream'
import { ROOM_STATUS_COLOR } from '../../config/theme'
import { Toggle } from '../ui/primitives'

const BANNERS = {
  [E.CORE_UNLOCKED]: { text: 'CORE UNLOCKED', tone: 'amber', ms: 2800 },
  [E.CORE_BREACHED]: { text: 'CORE BREACHED', tone: 'green', ms: 4200 },
}

// Overlay di atas canvas: legenda status, kontrol view, banner event core.
export default function StageOverlay() {
  const resetView = useLab((s) => s.resetView)
  const bloom = useLab((s) => s.bloom)
  const setBloom = useLab((s) => s.setBloom)
  const [banner, setBanner] = useState(null)

  useEffect(
    () =>
      eventStream.on((event) => {
        const b = BANNERS[event.type]
        if (b) setBanner({ ...b, key: event.eventId })
      }),
    [],
  )

  useEffect(() => {
    if (!banner) return undefined
    const id = setTimeout(() => setBanner(null), banner.ms)
    return () => clearTimeout(id)
  }, [banner])

  return (
    <>
      <div className="stage-legend">
        {Object.entries(ROOM_STATUS_COLOR).map(([status, color]) => (
          <span key={status} style={{ '--tone': color }}>
            <i />
            {status}
          </span>
        ))}
      </div>
      <div className="stage-tools">
        <button type="button" className="btn btn--sm" onClick={resetView}>
          Reset view
        </button>
        <Toggle id="bloom-toggle" label="Glow" checked={bloom} onChange={setBloom} />
      </div>
      {banner && (
        <div key={banner.key} className={`banner banner--${banner.tone}`}>
          {banner.text}
        </div>
      )}
    </>
  )
}
