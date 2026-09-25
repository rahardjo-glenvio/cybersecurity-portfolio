import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color } from 'three'
import { CORRIDOR_W, DECK_T } from '../layout'
import { MAT } from '../materials'
import { corridorGeometry, mergeBoxes } from '../geometry'
import { FLOW_STATE, createFlowMaterial } from './flowMaterial'

const _c = new Color()
const SWEEP_TIME = 1.3

// State jalur dari status kedua ujung (lobby dianggap sudah selesai).
export function corridorState(a, b) {
  if (a === 'LOCKED' || b === 'LOCKED') return 'LOCKED'
  if (a === 'ACTIVE' || b === 'ACTIVE') return 'ACTIVE'
  const done = (s) => s === 'SOLVED' || s === 'LOBBY'
  return done(a) && done(b) ? 'SOLVED' : 'AVAILABLE'
}

export default function Corridors({ layout, team }) {
  const status = new Map(team.rooms.map((r) => [r.id, r.status]))
  status.set('lobby', 'LOBBY')
  return (
    <group>
      {layout.corridors.map((c) => (
        <CorridorBridge key={c.key} corridor={c} state={corridorState(status.get(c.from), status.get(c.to))} />
      ))}
      <Pylons layout={layout} />
    </group>
  )
}

// Deck fisik (menerima & membuat shadow) + overlay glow tipis di atasnya.
function CorridorBridge({ corridor, state }) {
  const geo = useMemo(
    () => ({
      deck: corridorGeometry(corridor.points, corridor.tangents, CORRIDOR_W, { thickness: DECK_T }),
      glow: corridorGeometry(corridor.points, corridor.tangents, CORRIDOR_W, { lift: 0.004 }),
    }),
    [corridor],
  )
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo])

  const material = useMemo(createFlowMaterial, [])
  useEffect(() => () => material.dispose(), [material])

  const anim = useRef(null)
  if (!anim.current) {
    const cfg = FLOW_STATE[state]
    anim.current = { ...cfg, color: new Color(cfg.color), offset: 0, sweep: -1, prev: state }
  }
  useEffect(() => {
    const a = anim.current
    if (a.prev === 'LOCKED' && state !== 'LOCKED') a.sweep = 0 // jalur baru terbuka
    a.prev = state
  }, [state])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const a = anim.current
    const cfg = FLOW_STATE[state]
    const k = 1 - Math.exp(-dt * 4)
    a.color.lerp(_c.set(cfg.color), k)
    a.intensity += (cfg.intensity - a.intensity) * k
    a.flow += (cfg.flow - a.flow) * k
    a.speed += (cfg.speed - a.speed) * k
    a.offset += dt * a.speed
    if (a.sweep >= 0) a.sweep = a.sweep + dt / SWEEP_TIME > 1.25 ? -1 : a.sweep + dt / SWEEP_TIME

    const u = material.uniforms
    u.uColor.value.copy(a.color)
    u.uIntensity.value = a.intensity
    u.uFlow.value = a.flow
    u.uOffset.value = a.offset
    u.uSweep.value = a.sweep
    u.uLength.value = corridor.length
  })

  return (
    <group>
      <mesh geometry={geo.deck} material={MAT.bridge} castShadow receiveShadow />
      <mesh geometry={geo.glow} material={material} renderOrder={2} />
    </group>
  )
}

// Tiang penyangga bentang tinggi, digabung jadi satu draw call.
function Pylons({ layout }) {
  const geometry = useMemo(() => {
    const pieces = layout.corridors.flatMap((c) =>
      c.pylons.flatMap(({ x, z, h }) => [
        [0.36, 0.04, 0.36, x, 0.02, z],
        [0.12, h, 0.12, x, h / 2, z],
        [0.24, 0.03, 0.24, x, h - 0.015, z],
      ]),
    )
    return pieces.length ? mergeBoxes(pieces) : null
  }, [layout])
  useEffect(() => () => geometry?.dispose(), [geometry])
  return geometry ? <mesh geometry={geometry} material={MAT.pylon} castShadow receiveShadow /> : null
}
