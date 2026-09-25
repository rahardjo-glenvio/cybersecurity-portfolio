import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshBasicMaterial } from 'three'
import { LOCK_COLOR } from '../../../../config/theme'
import { MAT } from '../../materials'
import { box, useDisposables, useMerged } from '../kit'

// Modul tersegel: kontainer netral selama kategori room belum diungkap
// backend. Sengaja tidak memberi petunjuk kategori.
export default function SealedDecor({ annex, drive }) {
  const hl = annex.length / 2
  const hull = useMerged(
    () => [
      box([0.9, 0.46, 0.56], [0, 0.23, 0.5]),
      box([0.94, 0.04, 0.6], [0, 0.48, 0.5]),
      box([0.32, 0.28, 0.32], [-hl + 0.32, 0.14, 0.45], [0, 0.3, 0]),
      box([0.28, 0.22, 0.3], [hl - 0.36, 0.11, 0.62], [0, -0.2, 0]),
    ],
    [hl],
  )
  const res = useDisposables(
    () => ({
      band: new MeshBasicMaterial({ color: LOCK_COLOR, toneMapped: false }),
      beacon: new MeshBasicMaterial({ color: LOCK_COLOR, toneMapped: false }),
    }),
    [],
  )
  const bands = useMerged(() => [box([0.92, 0.05, 0.58], [0, 0.3, 0.5])], [])
  const beacon = useRef()

  useFrame(() => {
    const t = drive.current.time
    res.band.color.set(LOCK_COLOR).multiplyScalar(0.35)
    const blink = 0.5 + 0.5 * Math.sin(t * 2.4)
    res.beacon.color.set(LOCK_COLOR).multiplyScalar(0.4 + blink * 1.2)
    if (beacon.current) beacon.current.scale.setScalar(0.8 + blink * 0.3)
  })

  return (
    <group>
      <mesh geometry={hull} material={MAT.plinth} castShadow receiveShadow />
      <mesh geometry={bands} material={res.band} />
      <mesh ref={beacon} position={[0, 0.56, 0.5]} material={res.beacon}>
        <octahedronGeometry args={[0.045, 0]} />
      </mesh>
    </group>
  )
}
