import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { TetrahedronGeometry, TorusGeometry, Vector3 } from 'three'
import { MAT } from '../../materials'
import { box, cycle, cyl, useDisposables, useMerged } from '../kit'

const CUBE_Y = 0.62
const HALF = 0.3 // setengah lebar sangkar
const SUB = 0.09 // sisi sub-kubus
const SEGMENTS = 6
const CROWN = 4
const CORNERS = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => new Vector3(x, y, z))))
const _v = new Vector3()

// Pilar shard: [radius bawah, tinggi, x, z, rotasi].
const SHARDS = [
  [0.1, 1.35, -0.78, 0.4, [0, 0, 0.06]],
  [0.085, 1.0, -0.5, 0.72, [0.08, 0.9, -0.05]],
  [0.075, 0.72, -0.28, 0.34, [0, 0.4, 0.1]],
]

// REVERSING: deconstruction lab. Pilar shard, sangkar analysis chamber
// dengan kubus yang terurai lalu menyatu, ring segmen yang membuka, dan
// shard kecil mengorbit di atas sangkar.
export default function ReversingDecor({ annex, kit, drive }) {
  const cx = annex.length / 2 - 0.58
  const cz = 0.5

  const hull = useMerged(
    () => [
      ...SHARDS.flatMap(([r, h, x, z, rot]) => [cyl([0.015, r, h, 3], [x, h / 2, z], rot), cyl([0.14, 0.16, 0.04, 6], [x, 0.02, z])]),
      ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => box([0.035, 1.2, 0.035], [cx + sx * HALF, 0.6, cz + sz * HALF]))),
      ...ring(cx, cz, 0.06),
    ],
    [cx],
  )
  const soft = useMerged(() => ring(cx, cz, 1.18), [cx])
  const tips = useMerged(
    () =>
      SHARDS.map(([, h, x, z, [rx, , rz]]) =>
        box([0.05, 0.05, 0.05], [x - Math.sin(rz) * h * 0.5, h * Math.cos(rx) * Math.cos(rz), z + Math.sin(rx) * h * 0.5], [0.6, 0.6, 0]),
      ),
    [],
  )
  const res = useDisposables(
    () => ({
      segment: new TorusGeometry(0.36, 0.016, 4, 6, Math.PI / 3 - 0.14).rotateX(Math.PI / 2),
      shard: new TetrahedronGeometry(0.045, 0),
    }),
    [],
  )

  const cubes = useRef([])
  const cubeGroup = useRef()
  const segments = useRef([])
  const ringGroup = useRef()
  const crown = useRef([])

  useFrame(() => {
    const { time: t } = drive.current
    // Siklus urai: tahan utuh, terurai, tahan, menyatu kembali.
    const e = cycle(t, 5, [1.4, 0.8, 1.2, 0.8])
    cubeGroup.current.rotation.set(0.35, t * 0.5, 0)
    cubes.current.forEach((m, i) => m && m.position.copy(_v.copy(CORNERS[i]).multiplyScalar(SUB / 2 + 0.005 + e * 0.1)))
    ringGroup.current.rotation.y = -t * 0.4
    segments.current.forEach((m, i) => m && (m.position.y = (i % 2 ? 1 : -1) * e * 0.07))
    crown.current.forEach((m, i) => {
      if (!m) return
      const a = t * 0.8 + (i * Math.PI * 2) / CROWN
      m.position.set(cx + Math.cos(a) * HALF, 1.36 + Math.sin(t * 1.7 + i) * 0.05, cz + Math.sin(a) * HALF)
      m.rotation.set(t * 1.3 + i, t * 0.9, 0)
    })
  })

  return (
    <group>
      <mesh geometry={hull} material={MAT.hull} castShadow receiveShadow />
      <mesh geometry={soft} material={kit.soft} />
      <mesh geometry={tips} material={kit.glow} />
      <mesh position={[cx, 0.004, cz]} rotation-x={-Math.PI / 2} material={kit.pool} renderOrder={1}>
        <planeGeometry args={[0.52, 0.52]} />
      </mesh>
      <group ref={cubeGroup} position={[cx, CUBE_Y, cz]}>
        {CORNERS.map((_, i) => (
          <mesh key={i} ref={(el) => (cubes.current[i] = el)} material={kit.lit}>
            <boxGeometry args={[SUB, SUB, SUB]} />
          </mesh>
        ))}
      </group>
      <group ref={ringGroup} position={[cx, CUBE_Y, cz]}>
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <group key={i} rotation-y={(i * Math.PI * 2) / SEGMENTS}>
            <mesh ref={(el) => (segments.current[i] = el)} geometry={res.segment} material={kit.glow} />
          </group>
        ))}
      </group>
      {Array.from({ length: CROWN }, (_, i) => (
        <mesh key={i} ref={(el) => (crown.current[i] = el)} geometry={res.shard} material={kit.glow} />
      ))}
    </group>
  )
}

// Cincin persegi sangkar (4 batang) pada ketinggian y.
function ring(cx, cz, y) {
  return [
    box([HALF * 2 + 0.035, 0.035, 0.035], [cx, y, cz - HALF]),
    box([HALF * 2 + 0.035, 0.035, 0.035], [cx, y, cz + HALF]),
    box([0.035, 0.035, HALF * 2 + 0.035], [cx - HALF, y, cz]),
    box([0.035, 0.035, HALF * 2 + 0.035], [cx + HALF, y, cz]),
  ]
}
