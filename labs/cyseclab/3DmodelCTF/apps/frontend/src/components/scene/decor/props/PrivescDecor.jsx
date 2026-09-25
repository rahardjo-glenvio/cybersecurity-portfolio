import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, MeshBasicMaterial, MeshStandardMaterial } from 'three'
import { COLORS } from '../../../../config/theme'
import { rectFrame } from '../../geometry'
import { MAT } from '../../materials'
import { box, createFieldMaterial, cycle, hazardTexture, useDisposables, useMerged } from '../kit'

const DAIS = [-0.5, 0.5]
const TIERS = [0.76, 0.56, 0.36]
const TIER_H = 0.08
const KIOSK = [0.38, 0.66]
const TILT = -0.45
// Lampu izin: ditolak (terkunci) -> memproses -> diberikan (solved).
const PERMISSION = { LOCKED: COLORS.red, AVAILABLE: COLORS.amber, ACTIVE: COLORS.amber, SOLVED: COLORS.green }
const _c = new Color()

// PRIVILEGE ESCALATION: area akses terbatas. Dais bertingkat yang menyala
// berurutan, kiosk otorisasi dengan beam scan, palang checkpoint, bollard
// hazard, dan beacon peringatan berputar.
export default function PrivescDecor({ annex, kit, drive, status }) {
  const hl = annex.length / 2
  const [dx, dz] = DAIS
  const [kx, kz] = KIOSK
  const bx = hl - 0.15 // palang
  const bollards = [bx - 0.33, bx]

  const hull = useMerged(
    () => [
      ...TIERS.map((w, i) => box([w, TIER_H, w], [dx, TIER_H * (i + 0.5), dz])),
      box([0.2, 0.66, 0.16], [kx, 0.33, kz]),
      box([0.28, 0.035, 0.2], [kx, 0.69, kz], [TILT, 0, 0]),
      box([0.1, 0.56, 0.1], [bx, 0.28, 0.26]),
      box([0.13, 0.05, 0.13], [bx, 0.585, 0.26]),
      ...bollards.map((x) => box([0.13, 0.46, 0.13], [x, 0.23, 0.9])),
      box([0.1, 0.05, 0.1], [bx, 0.485, 0.9]),
    ],
    [hl],
  )
  const soft = useMerged(
    () => [
      box([0.2, 0.01, 0.13], [kx, 0.708, kz], [TILT, 0, 0]),
      ...bollards.map((x) => box([0.14, 0.06, 0.14], [x, 0.37, 0.9])),
    ],
    [hl],
  )
  const res = useDisposables(
    () => ({
      frames: TIERS.map((w) => rectFrame(w - 0.02, w - 0.02, 0.028)),
      tierMats: TIERS.map(() => new MeshBasicMaterial({ toneMapped: false })),
      emblem: new MeshBasicMaterial({ toneMapped: false }),
      permission: new MeshBasicMaterial({ toneMapped: false }),
      beam: createFieldMaterial({ bands: 4, speed: 0.8, sharp: 4 }),
      arm: new MeshStandardMaterial({ map: hazardTexture(), roughness: 0.5, metalness: 0.3 }),
    }),
    [],
  )

  const emblem = useRef()
  const beam = useRef()
  const arm = useRef()
  const flash = useRef()

  useFrame(() => {
    const { time: t, power: p, accent } = drive.current
    // Eskalasi: tingkat menyala bergiliran dari bawah ke atas.
    const step = (t * 1.2) % (TIERS.length + 1.5)
    res.tierMats.forEach((m, i) => {
      const lit = step >= i && step < TIERS.length + 0.8 ? 1 : 0.18
      m.color.copy(accent).multiplyScalar((0.25 + 1.1 * p) * lit)
    })
    const pulse = 0.5 + 0.5 * Math.sin(t * 3)
    res.emblem.color.copy(accent).multiplyScalar(0.4 + p * (0.8 + pulse * 0.8))
    emblem.current.rotation.y = t * 0.6
    emblem.current.position.y = 0.55 + Math.sin(t * 1.4) * 0.03

    const pending = status === 'AVAILABLE' || status === 'ACTIVE'
    const blink = pending ? (Math.sin(t * 6) > 0 ? 1 : 0.25) : 1
    res.permission.color.copy(_c.set(PERMISSION[status] ?? COLORS.amber)).multiplyScalar(1.6 * blink)

    beam.current.rotation.x = Math.sin(t * 1.3) * 0.35
    const u = res.beam.uniforms
    u.uColor.value.copy(accent)
    u.uTime.value = t
    u.uOpacity.value = 0.5 * p

    arm.current.rotation.z = -cycle(t, 6, [2.4, 0.8, 1.8, 0.8]) * 1.15 // lengan menjulur ke -x, naik = rotasi negatif
    flash.current.rotation.y = t * 4
  })

  return (
    <group>
      <mesh geometry={hull} material={MAT.hull} castShadow receiveShadow />
      <mesh geometry={soft} material={kit.soft} />
      {TIERS.map((_, i) => (
        <mesh key={i} geometry={res.frames[i]} position={[dx, TIER_H * (i + 1) + 0.002, dz]} material={res.tierMats[i]} />
      ))}
      <group ref={emblem} position={[dx, 0.55, dz]}>
        <mesh material={res.emblem}>
          <boxGeometry args={[0.14, 0.11, 0.05]} />
        </mesh>
        <mesh position={[0, 0.065, 0]} material={res.emblem}>
          <torusGeometry args={[0.045, 0.013, 6, 12, Math.PI]} />
        </mesh>
      </group>
      <mesh position={[kx, 0.6, kz - 0.085]} material={res.permission}>
        <boxGeometry args={[0.07, 0.025, 0.02]} />
      </mesh>
      <group ref={beam} position={[kx, 0.72, kz]}>
        <mesh position={[0, 0.28, 0]} material={res.beam}>
          <planeGeometry args={[0.32, 0.5]} />
        </mesh>
      </group>
      <group ref={arm} position={[bx, 0.5, 0.26]}>
        <mesh position={[-0.36, 0, 0]} material={res.arm} castShadow>
          <boxGeometry args={[0.72, 0.035, 0.035]} />
        </mesh>
        <mesh position={[-0.72, 0, 0]} material={kit.glow}>
          <boxGeometry args={[0.04, 0.045, 0.045]} />
        </mesh>
      </group>
      <group ref={flash} position={[bx, 0.54, 0.9]}>
        <mesh material={kit.lit}>
          <cylinderGeometry args={[0.045, 0.05, 0.06, 10]} />
        </mesh>
        <mesh position={[0.05, 0.005, 0]} material={kit.glow}>
          <boxGeometry args={[0.07, 0.035, 0.025]} />
        </mesh>
      </group>
    </group>
  )
}
