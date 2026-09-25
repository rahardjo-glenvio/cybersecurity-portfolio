import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, Color, DoubleSide, MeshBasicMaterial, Quaternion, Vector3 } from 'three'
import { EVENT_TYPES as E } from '@lab/shared'
import { COLORS } from '../../config/theme'
import { eventStream } from '../../lib/eventStream'
import { easeInOutSine, easeOutCubic, envelope } from '../../utils/anim'
import { FLOOR_H } from './layout'
import { markers } from './markers'
import UnlockBurst from './fx/UnlockBurst'

let seq = 0
const UP = new Vector3(0, 1, 0)

// Efek sekali jalan yang dipicu semantic event dari backend.
export default function FxLayer({ team }) {
  const teamRef = useRef(team)
  useLayoutEffect(() => {
    teamRef.current = team
  }, [team])
  const [fx, setFx] = useState([])

  useEffect(
    () =>
      eventStream.on((event) => {
        const t = teamRef.current
        const room = t.rooms.find((r) => r.id === event.roomId)
        const floor = room && new Vector3(room.position3D[0], room.position3D[1] + FLOOR_H + 0.02, room.position3D[2])
        const player = markers.get(event.playerId)?.pos.clone()
        const items = []
        const ring = (position, color, size, extra = {}) => position && items.push({ kind: 'ring', position, color, size, ...extra })

        switch (event.type) {
          case E.FILE_DOWNLOADED:
            if (player) items.push({ kind: 'file', target: player })
            break
          case E.INSTANCE_STARTED:
            ring(floor, COLORS.teal, 2.2)
            break
          case E.FLAG_WRONG:
            ring(player, COLORS.red, 1.4)
            ring(player, COLORS.red, 1.9, { delay: 0.18 })
            break
          case E.FLAG_CORRECT:
            ring(player, COLORS.green, 1.8)
            break
          case E.ROOM_SOLVED:
            ring(floor, COLORS.green, 3.6, { duration: 1.5 })
            ring(floor, COLORS.green, 4.4, { delay: 0.3, duration: 1.5 })
            break
          case E.ROOM_UNLOCKED:
            if (floor) items.push({ kind: 'unlock', position: floor.clone().add(new Vector3(0, room.type === 'core' ? 3 : 1.7, 0)) })
            ring(floor, COLORS.cyan, 3)
            break
          case E.CORE_UNLOCKED: {
            const solved = t.rooms.filter((r) => r.status === 'SOLVED' && r.id !== event.roomId)
            for (const r of solved) {
              items.push({ kind: 'beam', from: new Vector3(r.position3D[0], r.position3D[1] + 1.2, r.position3D[2]), to: floor.clone().add(new Vector3(0, 1.7, 0)) })
            }
            ring(floor, COLORS.amber, 5, { duration: 1.8 })
            break
          }
          case E.CORE_BREACHED:
            items.push({ kind: 'column', position: floor })
            ;[0, 0.35, 0.7, 1.05].forEach((delay, i) => ring(floor, COLORS.green, 5 + i * 2.2, { delay, duration: 1.8 }))
            break
          default:
            break
        }
        if (items.length) setFx((list) => [...list, ...items.map((it) => ({ ...it, id: ++seq }))])
      }),
    [],
  )

  const done = useCallback((id) => setFx((list) => list.filter((f) => f.id !== id)), [])

  return fx.map((f) => {
    switch (f.kind) {
      case 'ring':
        return <Ring key={f.id} fx={f} onDone={done} />
      case 'file':
        return <FileDrop key={f.id} fx={f} onDone={done} />
      case 'unlock':
        return <Unlock key={f.id} fx={f} onDone={done} />
      case 'beam':
        return <Beam key={f.id} fx={f} onDone={done} />
      case 'column':
        return <Column key={f.id} fx={f} onDone={done} />
      default:
        return null
    }
  })
}

// Timer per efek berbasis clock render; memanggil onDone sekali.
function useFxTime(fx, duration, onDone) {
  const start = useRef(null)
  const finished = useRef(false)
  return (clock) => {
    if (start.current === null) start.current = clock.elapsedTime + (fx.delay ?? 0)
    const age = clock.elapsedTime - start.current
    if (age > duration && !finished.current) {
      finished.current = true
      onDone(fx.id)
    }
    return age
  }
}

function useAdditive(color) {
  const mat = useMemo(
    () => new MeshBasicMaterial({ color, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false, side: DoubleSide }),
    [color],
  )
  useEffect(() => () => mat.dispose(), [mat])
  return mat
}

function Ring({ fx, onDone }) {
  const ref = useRef()
  const duration = fx.duration ?? 1.1
  const mat = useAdditive(fx.color)
  const base = useMemo(() => new Color(fx.color), [fx.color])
  const age = useFxTime(fx, duration, onDone)
  useFrame(({ clock }) => {
    const p = age(clock) / duration
    ref.current.visible = p >= 0 && p <= 1
    if (!ref.current.visible) return
    ref.current.scale.setScalar(0.2 + easeOutCubic(p) * fx.size)
    mat.color.copy(base).multiplyScalar(2.4 * (1 - p))
  })
  return (
    <mesh ref={ref} position={fx.position} rotation-x={-Math.PI / 2} material={mat} visible={false}>
      <ringGeometry args={[0.86, 1, 48]} />
    </mesh>
  )
}

// Ikon file 3D turun dari atas ke tracking point player.
function FileDrop({ fx, onDone }) {
  const ref = useRef()
  const from = useMemo(() => fx.target.clone().add(new Vector3(0.7, 2.6, 0.4)), [fx.target])
  const age = useFxTime(fx, 1.0, onDone)
  useFrame(({ clock }) => {
    const p = Math.min(1, age(clock) / 1.0)
    ref.current.position.lerpVectors(from, fx.target, easeInOutSine(p))
    ref.current.rotation.set(Math.sin(p * 6) * 0.3, p * Math.PI * 3, 0)
    ref.current.scale.setScalar(Math.max(0.001, p < 0.85 ? 1 : (1 - p) / 0.15))
  })
  return (
    <group ref={ref}>
      <mesh>
        <boxGeometry args={[0.22, 0.28, 0.03]} />
        <meshBasicMaterial color={new Color('#dbeafe').multiplyScalar(1.6)} toneMapped={false} />
      </mesh>
      {[0.05, -0.01, -0.07].map((y) => (
        <mesh key={y} position={[-0.01, y, 0.018]}>
          <planeGeometry args={[0.13, 0.02]} />
          <meshBasicMaterial color={new Color(COLORS.cyan).multiplyScalar(2)} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

// Reuse efek gembok terbuka dari prototype lama.
function Unlock({ fx, onDone }) {
  const clock = useThree((s) => s.clock)
  const t0 = useRef(clock.elapsedTime)
  const age = useFxTime(fx, 3, onDone)
  useFrame(({ clock: c }) => age(c))
  return <UnlockBurst t0Ref={t0} position={fx.position.toArray()} scale={0.9} />
}

// Beam energi dari room solved menuju core saat CORE_UNLOCKED.
function Beam({ fx, onDone }) {
  const ref = useRef()
  const mat = useAdditive(COLORS.amber)
  const { mid, len, quaternion } = useMemo(() => {
    const dir = fx.to.clone().sub(fx.from)
    return { mid: fx.from.clone().add(fx.to).multiplyScalar(0.5), len: dir.length(), quaternion: new Quaternion().setFromUnitVectors(UP, dir.normalize()) }
  }, [fx.from, fx.to])
  const age = useFxTime(fx, 2.6, onDone)
  useFrame(({ clock }) => {
    const e = envelope(age(clock), 0.3, 1.4, 0.9)
    mat.color.set(COLORS.amber).multiplyScalar(2.2 * e)
    ref.current.scale.set(1 + e * 0.5, 1, 1 + e * 0.5)
  })
  return (
    <mesh ref={ref} position={mid} quaternion={quaternion} material={mat}>
      <cylinderGeometry args={[0.05, 0.05, len, 6, 1, true]} />
    </mesh>
  )
}

// Kolom cahaya besar saat CORE_BREACHED.
function Column({ fx, onDone }) {
  const ref = useRef()
  const mat = useAdditive(COLORS.green)
  const age = useFxTime(fx, 3.4, onDone)
  useFrame(({ clock }) => {
    const e = envelope(age(clock), 0.25, 1.8, 1.3)
    mat.color.set(COLORS.green).multiplyScalar(1.1 * e)
    ref.current.scale.set(0.6 + e * 0.6, 1, 0.6 + e * 0.6)
  })
  return (
    <mesh ref={ref} position={fx.position.clone().add(new Vector3(0, 6, 0))} material={mat}>
      <cylinderGeometry args={[1.1, 1.8, 12, 12, 1, true]} />
    </mesh>
  )
}
