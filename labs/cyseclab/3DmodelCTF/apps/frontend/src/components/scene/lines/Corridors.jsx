import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, MeshBasicMaterial } from 'three'
import { CORRIDOR_W, DECK_T } from '../layout'
import { MAT } from '../materials'
import { box, corridorGeometry, mergeAll, mergeBoxes, sideOffsets } from '../geometry'
import { FLOW_STATE, createFlowMaterial } from './flowMaterial'

const _c = new Color()
const SWEEP_TIME = 1.3
const NODE = 0.07 // junction node di sudut ujung deck
const POST_H = 0.42 // gate post di port oktagon (core & lobby tidak punya dinding)

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
        <CorridorBridge
          key={c.key}
          corridor={c}
          ends={[layout.nodes.get(c.from).shape, layout.nodes.get(c.to).shape]}
          state={corridorState(status.get(c.from), status.get(c.to))}
        />
      ))}
      <Pylons layout={layout} />
    </group>
  )
}

// Soket di kedua ujung: junction node di sudut deck (room berdinding) atau
// gate post dengan node di puncaknya (port oktagon). Warna node = state jalur,
// jadi garis tepi terlihat "masuk" ke soket.
function socketGeometry(corridor, ends) {
  const offsets = sideOffsets(corridor.points, corridor.tangents, CORRIDOR_W)
  const nodes = []
  const posts = []
  const last = corridor.points.length - 1
  ;[[0, corridor.pa], [last, corridor.pb]].forEach(([i, port], k) => {
    const p = corridor.points[i]
    const side = offsets[i].clone().normalize()
    for (const s of [1, -1]) {
      if (ends[k] === 'octagon') {
        const at = p.clone().addScaledVector(side, s * (CORRIDOR_W / 2 + 0.09)).addScaledVector(port.normal, -0.06)
        posts.push([0.07, POST_H, 0.07, at.x, at.y + POST_H / 2, at.z])
        nodes.push(box([0.1, 0.05, 0.1, at.x, at.y + POST_H + 0.025, at.z]))
      } else {
        const at = p.clone().addScaledVector(offsets[i], s)
        nodes.push(box([NODE, 0.05, NODE, at.x, at.y + 0.025, at.z]))
      }
    }
  })
  return { nodes: mergeAll(nodes), posts: posts.length ? mergeBoxes(posts) : null }
}

// Deck fisik (menerima & membuat shadow) + overlay glow tipis di atasnya.
function CorridorBridge({ corridor, ends, state }) {
  const geo = useMemo(
    () => ({
      deck: corridorGeometry(corridor.points, corridor.tangents, CORRIDOR_W, { thickness: DECK_T }),
      glow: corridorGeometry(corridor.points, corridor.tangents, CORRIDOR_W, { lift: 0.004 }),
      ...socketGeometry(corridor, ends),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [corridor, ends[0], ends[1]],
  )
  useEffect(() => () => Object.values(geo).forEach((g) => g?.dispose()), [geo])

  const material = useMemo(createFlowMaterial, [])
  const nodeMat = useMemo(() => new MeshBasicMaterial({ toneMapped: false }), [])
  useEffect(
    () => () => {
      material.dispose()
      nodeMat.dispose()
    },
    [material, nodeMat],
  )

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
    nodeMat.color.copy(a.color).multiplyScalar(0.5 + a.intensity * 1.1)
  })

  return (
    <group>
      <mesh geometry={geo.deck} material={MAT.bridge} castShadow receiveShadow />
      <mesh geometry={geo.glow} material={material} renderOrder={2} />
      <mesh geometry={geo.nodes} material={nodeMat} />
      {geo.posts && <mesh geometry={geo.posts} material={MAT.pylon} castShadow />}
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
