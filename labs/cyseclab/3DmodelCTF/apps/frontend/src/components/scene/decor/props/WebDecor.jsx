import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshBasicMaterial } from 'three'
import { hash } from '../../../../utils/anim'
import { MAT } from '../../materials'
import { box, createFieldMaterial, useDisposables, useMerged, webContentTexture } from '../kit'

const Z = 0.55 // garis tengah props di kedalaman annex
const PACKETS = 3

// WEB: gateway/endpoint. Portal arch dengan aliran data, dua screen pillar
// berkonten halaman yang bergulir + scan bar, dan paket akses menuju room.
export default function WebDecor({ annex, kit, drive }) {
  const sx = annex.length / 2 - 0.26
  const hull = useMerged(
    () => [
      box([0.08, 1.45, 0.08], [-0.42, 0.725, Z]),
      box([0.08, 1.45, 0.08], [0.42, 0.725, Z]),
      box([0.94, 0.09, 0.12], [0, 1.49, Z]),
      box([1.0, 0.035, 0.36], [0, 0.0175, Z]),
      ...[-sx, sx].flatMap((x) => [box([0.32, 1.12, 0.05], [x, 0.72, Z]), box([0.4, 0.1, 0.22], [x, 0.05, Z])]),
    ],
    [sx],
  )
  const soft = useMerged(
    () => [
      box([0.014, 1.3, 0.05], [-0.374, 0.72, Z]),
      box([0.014, 1.3, 0.05], [0.374, 0.72, Z]),
      box([0.8, 0.014, 0.05], [0, 1.44, Z]),
      box([0.05, 0.008, 0.34], [0, 0.004, 0.2]), // jalur akses ke dinding room
      ...[-sx, sx].map((x) => box([0.3, 0.05, 0.056], [x, 1.245, Z])), // chrome browser
    ],
    [sx],
  )
  const res = useDisposables(() => {
    const content = webContentTexture().clone()
    content.needsUpdate = true
    return {
      content,
      screen: new MeshBasicMaterial({ map: content, toneMapped: false }),
      portal: createFieldMaterial({ bands: 7, speed: 0.45, sharp: 8 }),
    }
  }, [])
  const scans = useRef([])
  const packets = useRef([])

  useFrame(() => {
    const { time: t, power: p, accent } = drive.current
    res.content.offset.y = -t * 0.06
    const flicker = hash(Math.floor(t * 7)) > 0.94 ? 0.6 : 1
    res.screen.color.copy(accent).multiplyScalar((0.35 + 0.85 * p) * flicker)
    const u = res.portal.uniforms
    u.uColor.value.copy(accent)
    u.uTime.value = t
    u.uOpacity.value = 0.55 * p
    scans.current.forEach((m, i) => m && (m.position.y = 0.22 + ((t * 0.32 + i * 0.5) % 1) * 0.94))
    packets.current.forEach((m, i) => {
      if (!m) return
      const f = (t * 0.55 + i / PACKETS) % 1
      m.position.z = 0.5 - f * 0.46
      m.scale.setScalar(Math.max(0.001, Math.sin(f * Math.PI)))
    })
  })

  return (
    <group>
      <mesh geometry={hull} material={MAT.hull} castShadow receiveShadow />
      <mesh geometry={soft} material={kit.soft} />
      {[-sx, sx].map((x, i) => (
        <group key={i} position={[x, 0.69, Z]}>
          <mesh position={[0, 0, 0.0255]} material={res.screen}>
            <planeGeometry args={[0.27, 0.94]} />
          </mesh>
          <mesh position={[0, 0, -0.0255]} rotation-y={Math.PI} material={res.screen}>
            <planeGeometry args={[0.27, 0.94]} />
          </mesh>
        </group>
      ))}
      {[-sx, sx].map((x, i) => (
        <mesh key={i} ref={(el) => (scans.current[i] = el)} position={[x, 0.5, Z]} material={kit.glow}>
          <boxGeometry args={[0.3, 0.012, 0.058]} />
        </mesh>
      ))}
      <mesh position={[0, 0.74, Z]} material={res.portal}>
        <planeGeometry args={[0.76, 1.36]} />
      </mesh>
      {Array.from({ length: PACKETS }, (_, i) => (
        <mesh key={i} ref={(el) => (packets.current[i] = el)} position={[0, 0.035, 0.3]} material={kit.glow}>
          <boxGeometry args={[0.045, 0.045, 0.045]} />
        </mesh>
      ))}
    </group>
  )
}
