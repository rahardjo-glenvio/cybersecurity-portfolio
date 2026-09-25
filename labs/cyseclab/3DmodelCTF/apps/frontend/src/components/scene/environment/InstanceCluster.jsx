import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { Vector3 } from 'three'
import { COLORS } from '../../../config/theme'
import { WALL_H } from '../layout'
import { MAT, glowMaterial } from '../materials'
import { rectFrame } from '../geometry'
import ServerRack from '../ServerRack'
import { floorLabelTexture } from './textures'

const PAD = [2.7, 0.06, 1.5]
const RACK_TOP = 2.3

// Infrastruktur instance challenge: dua rack menghadap kamera utama. Garis menyala ke
// room yang instance-nya sedang berjalan.
export default function InstanceCluster({ layout, team }) {
  const { x, z } = layout.cluster
  const running = team.rooms.filter((r) => r.instanceActive)
  const res = useMemo(
    () => ({
      frame: rectFrame(PAD[0] - 0.12, PAD[2] - 0.12, 0.04),
      trim: glowMaterial(COLORS.teal, 0.8),
      label: floorLabelTexture('INSTANCE CLUSTER', '#5eead4'),
    }),
    [],
  )
  useEffect(() => () => Object.values(res).forEach((r) => r.dispose()), [res])
  const load = Math.min(1, running.length / 2)

  return (
    <group>
      <group position={[x, 0, z]}>
        <mesh position={[0, PAD[1] / 2, 0]} material={MAT.pad} castShadow receiveShadow>
          <boxGeometry args={PAD} />
        </mesh>
        <mesh geometry={res.frame} position={[0, PAD[1] + 0.003, 0]} material={res.trim} />
        <ServerRack position={[-0.62, PAD[1], 0]} load={load} seed={3} />
        <ServerRack position={[0.62, PAD[1], 0]} load={load} seed={7} />
        <mesh position={[0, 0.004, PAD[2] / 2 + 0.45]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[2.6, 2.6 / 6.4]} />
          <meshBasicMaterial map={res.label} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
      {running.map((r) => {
        const node = layout.nodes.get(r.id)
        return <InstanceLink key={r.id} from={[x, RACK_TOP, z]} to={[node.x, node.floorY + WALL_H + 0.4, node.z]} />
      })}
    </group>
  )
}

// Busur kuadratik dari puncak rack ke atas room, cukup tinggi agar tidak
// memotong modul lain.
function InstanceLink({ from, to }) {
  const line = useRef()
  const key = [...from, ...to].join(',')
  const points = useMemo(() => {
    const a = new Vector3(...from)
    const b = new Vector3(...to)
    const mid = a.clone().add(b).multiplyScalar(0.5)
    mid.y = Math.max(a.y, b.y) + 1.8
    return Array.from({ length: 33 }, (_, i) => {
      const t = i / 32
      return new Vector3()
        .copy(a)
        .multiplyScalar((1 - t) * (1 - t))
        .addScaledVector(mid, 2 * (1 - t) * t)
        .addScaledVector(b, t * t)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  useFrame((_, dt) => {
    if (line.current) line.current.material.dashOffset -= dt * 1.5
  })
  return <Line ref={line} points={points} color={COLORS.teal} lineWidth={2} dashed dashSize={0.25} gapSize={0.15} toneMapped={false} />
}
