import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { useLab } from '../../state/store'
import { ROOM_STATUS_COLOR } from '../../config/theme'
import { APOTHEM, FLOOR_H } from './layout'

// Label room = chip HTML di satu layer DOM (di luar canvas), selalu tajam di
// zoom apa pun. Posisi diproyeksikan tiap frame oleh LabelProjector dan
// ditulis langsung ke style elemen, tanpa re-render React.
const elements = new Map()
const _v = new Vector3()

// Digantung di depan tepi room supaya tidak menutupi modul di belakangnya.
function anchorOf(node) {
  const front = node.shape === 'rect' ? node.d / 2 : node.radius * APOTHEM
  return new Vector3(node.x, node.y + FLOOR_H / 2, node.z + front + 0.2)
}

// Di dalam <Canvas>.
export function LabelProjector({ layout }) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const anchors = useMemo(() => new Map([...layout.nodes.values()].map((n) => [n.id, anchorOf(n)])), [layout])
  useFrame(() => {
    for (const [id, el] of elements) {
      const anchor = anchors.get(id)
      if (!anchor) continue
      _v.copy(anchor).project(camera)
      const hidden = _v.z > 1 || Math.abs(_v.x) > 1.2 || Math.abs(_v.y) > 1.2
      el.style.visibility = hidden ? 'hidden' : 'visible'
      el.style.transform = `translate3d(${((_v.x + 1) / 2) * size.width}px, ${((1 - _v.y) / 2) * size.height}px, 0)`
      el.style.zIndex = String(Math.round((1 - _v.z) * 1000))
    }
  })
  return null
}

// Di luar <Canvas>, sebagai sibling di stage.
export default function RoomLabels({ team }) {
  const selectedRoomId = useLab((s) => s.selectedRoomId)
  const selectRoom = useLab((s) => s.selectRoom)

  return (
    <div className="room-tags" aria-label="Label room">
      {team.rooms.map((room) => {
        const locked = room.status === 'LOCKED'
        return (
          <div
            key={room.id}
            className="room-tags__anchor"
            ref={(el) => (el ? elements.set(room.id, el) : elements.delete(room.id))}
          >
            <button
              type="button"
              className={`room-tag${locked ? ' is-locked' : ''}${room.id === selectedRoomId ? ' is-selected' : ''}${room.type === 'core' ? ' is-core' : ''}`}
              style={{ '--tone': ROOM_STATUS_COLOR[room.status] }}
              onClick={() => selectRoom(room.id)}
            >
              <span className="room-tag__name">{room.name ?? room.id}</span>
              <span className="room-tag__meta">
                <i />
                {locked ? 'SEALED' : `${String(room.category ?? '').replace('reverse-engineering', 'reversing').toUpperCase()} · ${room.points} PTS`}
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
