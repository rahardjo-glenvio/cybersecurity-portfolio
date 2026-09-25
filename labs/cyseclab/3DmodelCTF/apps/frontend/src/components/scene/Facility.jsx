import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { Color, MeshBasicMaterial, Quaternion, Vector3 } from 'three'
import { useLab } from '../../state/store'
import { COLORS } from '../../config/theme'
import { plainLabelTexture } from './labels'
import { FLOOR_H } from './markers'
import RoomModule from './RoomModule'
import ServerRack from './ServerRack'

const CLUSTER = { position: [10.5, 0, 1.5], top: new Vector3(10.5, 2.3, 1.5) }
const UP = new Vector3(0, 0, 1)

// Seluruh virtual building milik satu tim, dibangun dari snapshot backend.
export default function Facility({ team }) {
  const selectedRoomId = useLab((s) => s.selectedRoomId)
  const selectRoom = useLab((s) => s.selectRoom)

  // Ujung corridor sedikit di dalam slab supaya bridge tertanam di room.
  const anchors = useMemo(() => {
    const map = new Map([['lobby', new Vector3(team.lobby.position3D[0], 0.1, team.lobby.position3D[2])]])
    for (const r of team.rooms) map.set(r.id, new Vector3(r.position3D[0], r.position3D[1] + FLOOR_H * 0.6, r.position3D[2]))
    return map
  }, [team.rooms, team.lobby])

  return (
    <group>
      <Lobby position={team.lobby.position3D} />
      {team.corridors.map((c) => (
        <Corridor key={`${c.from}-${c.to}`} from={anchors.get(c.from)} to={anchors.get(c.to)} open={c.open} />
      ))}
      {team.rooms.map((room) => (
        <RoomModule key={room.id} room={room} selected={room.id === selectedRoomId} onSelect={selectRoom} />
      ))}
      <InstanceCluster team={team} />
    </group>
  )
}

// Bridge low-poly antar room. Terang + paket data mengalir saat kedua ujung terbuka.
function Corridor({ from, to, open }) {
  const { mid, len, quaternion } = useMemo(() => {
    const dir = to.clone().sub(from)
    return {
      mid: from.clone().add(to).multiplyScalar(0.5),
      len: dir.length(),
      quaternion: new Quaternion().setFromUnitVectors(UP, dir.normalize()),
    }
  }, [from, to])
  const strip = useMemo(() => new MeshBasicMaterial({ toneMapped: false }), [])
  useEffect(() => () => strip.dispose(), [strip])
  const pulses = [useRef(), useRef()]
  const level = useRef(open ? 1 : 0)

  useFrame(({ clock }, dt) => {
    level.current += ((open ? 1 : 0) - level.current) * Math.min(1, dt * 3)
    strip.color.set(open ? COLORS.cyan : COLORS.slate).multiplyScalar(0.35 + level.current * 1.2)
    pulses.forEach((p, i) => {
      p.current.visible = level.current > 0.5
      p.current.position.z = (((clock.elapsedTime * 0.35 + i * 0.5) % 1) - 0.5) * len
    })
  })

  return (
    <group position={mid} quaternion={quaternion}>
      <mesh>
        <boxGeometry args={[0.62, 0.06, len]} />
        <meshStandardMaterial color="#0d1626" roughness={0.6} metalness={0.4} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.3, 0.1, 0]}>
          <boxGeometry args={[0.04, 0.14, len]} />
          <meshStandardMaterial color="#1a2638" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 0.04, 0]} material={strip}>
        <boxGeometry args={[0.06, 0.02, len]} />
      </mesh>
      {pulses.map((ref, i) => (
        <mesh key={i} ref={ref} position={[0, 0.09, 0]}>
          <icosahedronGeometry args={[0.07, 0]} />
          <meshBasicMaterial color={new Color(COLORS.cyan).multiplyScalar(2.4)} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

function Lobby({ position }) {
  const label = useMemo(() => plainLabelTexture('LOBBY · STAGING'), [])
  useEffect(() => () => label.dispose(), [label])
  return (
    <group position={position}>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[1.7, 1.85, 0.12, 6]} />
        <meshStandardMaterial color="#0d1627" roughness={0.6} metalness={0.4} flatShading />
      </mesh>
      <mesh position={[0, 0.125, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[1.45, 1.55, 6]} />
        <meshBasicMaterial color={new Color(COLORS.cyan).multiplyScalar(0.9)} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.9, -1.7]}>
        <planeGeometry args={[2.6, 0.49]} />
        <meshBasicMaterial map={label} transparent toneMapped={false} />
      </mesh>
    </group>
  )
}

// Infrastruktur instance (reuse ServerRack). Garis menyala ke room yang
// instance challenge-nya berjalan.
function InstanceCluster({ team }) {
  const label = useMemo(() => plainLabelTexture('INSTANCE CLUSTER', '#5eead4'), [])
  useEffect(() => () => label.dispose(), [label])
  const running = team.rooms.filter((r) => r.instanceActive)
  return (
    <group>
      <ServerRack position={CLUSTER.position} rotationY={-Math.PI / 2} load={Math.min(1, running.length / 2)} seed={3} />
      <mesh position={[CLUSTER.position[0], 2.75, CLUSTER.position[2]]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[2.4, 0.45]} />
        <meshBasicMaterial map={label} transparent toneMapped={false} />
      </mesh>
      {running.map((r) => (
        <InstanceLink key={r.id} to={new Vector3(r.position3D[0], r.position3D[1] + FLOOR_H + 1.3, r.position3D[2])} />
      ))}
    </group>
  )
}

function InstanceLink({ to }) {
  const line = useRef()
  const points = useMemo(() => {
    const midPoint = CLUSTER.top.clone().add(to).multiplyScalar(0.5)
    midPoint.y += 2
    const out = []
    for (let i = 0; i <= 24; i++) {
      const t = i / 24
      out.push(
        new Vector3()
          .copy(CLUSTER.top)
          .multiplyScalar((1 - t) * (1 - t))
          .addScaledVector(midPoint, 2 * (1 - t) * t)
          .addScaledVector(to, t * t),
      )
    }
    return out
  }, [to])
  useFrame((_, dt) => {
    if (line.current) line.current.material.dashOffset -= dt * 1.5
  })
  return <Line ref={line} points={points} color={COLORS.teal} lineWidth={2} dashed dashSize={0.25} gapSize={0.15} toneMapped={false} />
}
