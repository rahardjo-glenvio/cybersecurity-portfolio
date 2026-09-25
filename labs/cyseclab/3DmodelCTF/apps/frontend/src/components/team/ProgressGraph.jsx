import { useMemo } from 'react'
import { useLab } from '../../state/store'
import { ROOM_STATUS_COLOR } from '../../config/theme'

const W = 260
const H = 200
const PAD = 22

// Mini graph dependency (proyeksi atas dari posisi 3D). Status dari backend.
export default function ProgressGraph({ team }) {
  const selectRoom = useLab((s) => s.selectRoom)
  const layout = useMemo(() => {
    const nodes = [...team.rooms, { id: 'lobby', name: 'Lobby', position3D: team.lobby.position3D, status: 'LOBBY' }]
    const xs = nodes.map((n) => n.position3D[0])
    const zs = nodes.map((n) => n.position3D[2])
    const [minX, maxX, minZ, maxZ] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]
    const sx = (x) => PAD + ((x - minX) / (maxX - minX || 1)) * (W - PAD * 2)
    const sy = (z) => PAD + ((z - minZ) / (maxZ - minZ || 1)) * (H - PAD * 2)
    return new Map(nodes.map((n) => [n.id, { ...n, x: sx(n.position3D[0]), y: sy(n.position3D[2]) }]))
  }, [team.rooms, team.lobby])

  const playersByRoom = new Map()
  team.players.forEach((p) => playersByRoom.set(p.currentRoom, [...(playersByRoom.get(p.currentRoom) ?? []), p]))

  return (
    <svg className="graph" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Dependency graph room">
      {team.corridors.map((c) => {
        const a = layout.get(c.from)
        const b = layout.get(c.to)
        return (
          <line
            key={`${c.from}-${c.to}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            className={`graph__edge graph__edge--${c.kind}${c.open ? ' is-open' : ''}`}
          />
        )
      })}
      {[...layout.values()].map((n) => {
        const core = n.type === 'core'
        const color = n.status === 'LOBBY' ? '#475569' : ROOM_STATUS_COLOR[n.status]
        return (
          <g key={n.id} className="graph__node" onClick={() => n.status !== 'LOBBY' && selectRoom(n.id)}>
            <circle cx={n.x} cy={n.y} r={core ? 11 : 8} fill="var(--panel)" stroke={color} strokeWidth={core ? 3 : 2.5} />
            {n.status === 'SOLVED' && <circle cx={n.x} cy={n.y} r={core ? 5 : 3.5} fill={color} />}
            <text x={n.x} y={n.y + (core ? 24 : 20)} textAnchor="middle">
              {(n.name ?? n.id).split(' ')[0]}
            </text>
            {(playersByRoom.get(n.id) ?? []).map((p, i) => (
              <circle key={p.id} cx={n.x + 12 + i * 8} cy={n.y - 9} r={3.6} fill={p.color} stroke="var(--bg)" strokeWidth="1" />
            ))}
          </g>
        )
      })}
    </svg>
  )
}
