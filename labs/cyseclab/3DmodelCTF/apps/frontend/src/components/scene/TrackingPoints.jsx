import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import { AdditiveBlending, Color, MeshBasicMaterial, Vector3 } from 'three'
import { EVENT_TYPES as E } from '@lab/shared'
import { ACTIVITY_COLOR, COLORS } from '../../config/theme'
import { eventStream } from '../../lib/eventStream'
import { damp } from '../../utils/anim'
import { playerLabelTexture } from './labels'
import { markers, roomCenter, slotPosition } from './markers'

const SPEED = 3.4
const PULSE_COLOR = {
  [E.TOOL_OPENED]: COLORS.violet,
  [E.FILE_DOWNLOADED]: COLORS.cyan,
  [E.INSTANCE_STARTED]: COLORS.teal,
  [E.FLAG_ATTEMPT]: COLORS.amber,
  [E.FLAG_WRONG]: COLORS.red,
  [E.FLAG_CORRECT]: COLORS.green,
  [E.PLAYER_ACTIVE]: COLORS.cyan,
}
const now = () => performance.now() / 1000

// Player = tracking point (bukan humanoid). Posisi resmi dari backend;
// perpindahan dianimasikan mengikuti path corridor yang dihitung backend.
export default function TrackingPoints({ team }) {
  const teamRef = useRef(team)
  useLayoutEffect(() => {
    teamRef.current = team
    // Sinkron snapshot: kalau tidak sedang bergerak dan room berbeda, pindahkan.
    team.players.forEach((p, i) => {
      const target = slotPosition(team, p.currentRoom, i)
      const mk = markers.get(p.id)
      if (!mk) {
        markers.set(p.id, { pos: target, queue: [], room: p.currentRoom, pulseAt: -10, pulseColor: COLORS.cyan })
      } else if (mk.room !== p.currentRoom && !mk.queue.length) {
        mk.pos.copy(target)
        mk.room = p.currentRoom
      }
    })
  }, [team])

  useEffect(() => {
    const unsubscribe = eventStream.on((event) => {
      const t = teamRef.current
      const index = t.players.findIndex((p) => p.id === event.playerId)
      const mk = markers.get(event.playerId)
      if (!mk || index < 0) return
      if (event.type === E.PLAYER_ENTERED_ROOM) {
        const path = event.payload?.path?.length ? event.payload.path : [mk.room, event.roomId]
        const hops = path.slice(1)
        mk.queue = hops.map((id, k) => (k === hops.length - 1 ? slotPosition(t, id, index) : roomCenter(t, id)))
        mk.room = event.roomId
      } else if (PULSE_COLOR[event.type]) {
        mk.pulseAt = now()
        mk.pulseColor = PULSE_COLOR[event.type]
      }
    })
    return () => {
      unsubscribe()
      markers.clear()
    }
  }, [])

  return team.players.map((p, i) => <PlayerMarker key={p.id} player={p} index={i} />)
}

function PlayerMarker({ player, index }) {
  const group = useRef()
  const core = useRef()
  const halo = useRef()
  const orbit = useRef()
  const pulse = useRef()

  const mats = useMemo(
    () => ({
      core: new MeshBasicMaterial({ toneMapped: false }),
      halo: new MeshBasicMaterial({ toneMapped: false }),
      pulse: new MeshBasicMaterial({ transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
      beam: new MeshBasicMaterial({ transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false }),
      current: new Color(ACTIVITY_COLOR[player.activityState]),
      tmp: new Color(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  useEffect(() => () => ['core', 'halo', 'pulse', 'beam'].forEach((k) => mats[k].dispose()), [mats])
  const label = useMemo(() => playerLabelTexture(player.name, player.color), [player.name, player.color])
  useEffect(() => () => label.dispose(), [label])
  const dim = useRef(1)
  const dir = useMemo(() => new Vector3(), [])

  useFrame(({ clock }, delta) => {
    const mk = markers.get(player.id)
    if (!mk) return
    const dt = Math.min(delta, 0.05)
    const t = clock.elapsedTime
    const state = player.activityState

    if (mk.queue.length) {
      const next = mk.queue[0]
      const dist = mk.pos.distanceTo(next)
      const step = SPEED * dt
      if (dist <= step) {
        mk.pos.copy(next)
        mk.queue.shift()
      } else {
        mk.pos.addScaledVector(dir.subVectors(next, mk.pos).normalize(), step)
      }
    }
    group.current.position.copy(mk.pos)
    group.current.position.y += Math.sin(t * 2 + index) * 0.05

    // Warna halo = activity state; core = warna player.
    const target = state === 'ERROR' && Math.sin(t * 20) > 0 ? COLORS.red : ACTIVITY_COLOR[state]
    mats.current.lerp(mats.tmp.set(target), 1 - Math.exp(-dt * 10))
    dim.current = damp(dim.current, state === 'IDLE' ? 0.45 : 1, 4, dt)
    const blink = state === 'SUBMITTING' ? 0.6 + 0.4 * Math.sin(t * 14) : 1
    mats.halo.color.copy(mats.current).multiplyScalar(2 * dim.current * blink)
    mats.core.color.set(player.color).multiplyScalar(1.3 + dim.current * 1.2)
    mats.beam.color.copy(mats.current)
    core.current.scale.setScalar(0.8 + dim.current * 0.2 + (state === 'SUCCESS' ? Math.abs(Math.sin(t * 6)) * 0.3 : 0))
    halo.current.rotation.z += dt * (state === 'ANALYZING' ? 3 : 0.8)
    orbit.current.visible = state === 'ANALYZING'
    orbit.current.rotation.y += dt * 4

    const age = now() - mk.pulseAt
    const p = age / 0.9
    pulse.current.visible = p >= 0 && p < 1
    if (pulse.current.visible) {
      pulse.current.scale.setScalar(0.4 + p * 2.6)
      mats.pulse.color.set(mk.pulseColor).multiplyScalar(2.2 * (1 - p))
    }
  })

  return (
    <group ref={group}>
      <mesh ref={core} material={mats.core}>
        <icosahedronGeometry args={[0.2, 1]} />
      </mesh>
      <mesh ref={halo} rotation-x={Math.PI / 2} material={mats.halo}>
        <torusGeometry args={[0.34, 0.028, 6, 24, Math.PI * 1.6]} />
      </mesh>
      <group ref={orbit} visible={false}>
        <mesh position={[0.5, 0, 0]} material={mats.halo}>
          <icosahedronGeometry args={[0.06, 0]} />
        </mesh>
      </group>
      <mesh ref={pulse} rotation-x={-Math.PI / 2} material={mats.pulse} visible={false}>
        <ringGeometry args={[0.3, 0.36, 32]} />
      </mesh>
      <mesh position={[0, -0.28, 0]} material={mats.beam}>
        <cylinderGeometry args={[0.012, 0.012, 0.56, 6]} />
      </mesh>
      <Billboard position={[0, 0.52, 0]}>
        <mesh renderOrder={10}>
          <planeGeometry args={[0.46, 0.23]} />
          <meshBasicMaterial map={label} transparent depthTest={false} depthWrite={false} toneMapped={false} />
        </mesh>
      </Billboard>
    </group>
  )
}
