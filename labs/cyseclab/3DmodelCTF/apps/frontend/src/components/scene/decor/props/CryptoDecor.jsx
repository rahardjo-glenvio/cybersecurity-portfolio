import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CylinderGeometry, IcosahedronGeometry, MeshBasicMaterial, MeshStandardMaterial } from 'three'
import { SURFACE } from '../../../../config/theme'
import { MAT } from '../../materials'
import { box, clamp01, cyl, glyphColumnTexture, glyphRingTexture, smooth, useDisposables, useMerged } from '../kit'

const ROTOR = [-0.5, 0.5]
const DISK_Y = [0.32, 0.52, 0.72, 0.92]
const DISK_MOTION = [
  [2.2, 1],
  [3.1, -1],
  [1.7, 1],
  [2.7, -1],
] // [periode detik, arah]
const STEP = (Math.PI * 2) / 16 // satu glyph
const ORBIT = 6

// Morse "CTF": titik 1 unit, garis 3, jeda antar-simbol 1, antar-huruf 3, antar-kata 7.
const MORSE = { C: '-.-.', T: '-', F: '..-.' }
const UNIT = 0.16
const TIMELINE = [...'CTF'].flatMap((ch, li, word) => [
  ...[...MORSE[ch]].flatMap((s, si) => [...(si ? [[false, 1]] : []), [true, s === '.' ? 1 : 3]]),
  [false, li === word.length - 1 ? 7 : 3],
])
const TOTAL = TIMELINE.reduce((sum, [, u]) => sum + u, 0)

function signalAt(t) {
  let u = (t / UNIT) % TOTAL
  for (const [on, len] of TIMELINE) {
    if (u < len) return on
    u -= len
  }
  return false
}

// CRYPTOGRAPHY: ruang cipher & relay telegraf. Rotor disk glyph yang
// berputar bertahap sampai sejajar penanda, obelisk ter-enkode, dan
// perangkat telegraf yang mengirim "CTF" dalam Morse.
export default function CryptoDecor({ annex, kit, drive }) {
  const hl = annex.length / 2
  const [rx, rz] = ROTOR
  const [ox, oz] = [hl - 0.24, 0.55] // obelisk
  const [tx, tz] = [0.16, 0.6] // telegraf

  const hull = useMerged(
    () => [
      cyl([0.3, 0.34, 0.12, 12], [rx, 0.06, rz]),
      cyl([0.03, 0.03, 1.06, 8], [rx, 0.65, rz]),
      cyl([0.07, 0.05, 0.05, 8], [rx, 1.205, rz]),
      box([0.34, 0.08, 0.34], [ox, 0.04, oz]),
      box([0.4, 0.06, 0.24], [tx, 0.03, tz]),
      cyl([0.035, 0.035, 0.1, 8], [tx - 0.12, 0.11, tz]),
      box([0.05, 0.05, 0.05], [tx + 0.12, 0.085, tz]),
      cyl([0.012, 0.012, 0.5, 6], [tx + 0.18, 0.31, tz - 0.08]),
    ],
    [hl],
  )
  const soft = useMerged(() => [box([0.012, 0.72, 0.012], [rx + 0.29, 0.62, rz])], []) // garis baca rotor
  const glowStatic = useMerged(() => [cyl([0, 0.1, 0.14, 4, Math.PI / 4], [ox, 0.08 + 1.45 + 0.07, oz])], [hl])

  const res = useDisposables(() => {
    const column = glyphColumnTexture().clone()
    column.repeat.set(4, 1.5)
    column.needsUpdate = true
    return {
      column,
      disk: new CylinderGeometry(0.26, 0.26, 0.075, 24),
      diskSide: new MeshStandardMaterial({ color: SURFACE.hull, roughness: 0.4, metalness: 0.5, flatShading: true, emissive: '#000', emissiveMap: glyphRingTexture() }),
      obelisk: cyl([0.1, 0.15, 1.45, 4, Math.PI / 4], [0, 0, 0]),
      obeliskMat: new MeshStandardMaterial({ color: SURFACE.hull, roughness: 0.45, metalness: 0.4, flatShading: true, emissive: '#000', emissiveMap: column }),
      lamp: new IcosahedronGeometry(0.05, 0),
      lampMat: new MeshBasicMaterial({ toneMapped: false }),
    }
  }, [])

  const disks = useRef([])
  const lever = useRef()
  const orbit = useRef([])
  const signal = useRef(0)

  useFrame((_, delta) => {
    const { time: t, power: p, accent } = drive.current
    disks.current.forEach((m, i) => {
      if (!m) return
      const [period, dir] = DISK_MOTION[i]
      const u = t / period
      m.rotation.y = dir * STEP * (Math.floor(u) + smooth(clamp01((u % 1 - 0.7) / 0.3)))
    })
    res.column.offset.y = -t * 0.12
    res.diskSide.emissive.copy(accent)
    res.diskSide.emissiveIntensity = 0.35 + 1.0 * p
    res.obeliskMat.emissive.copy(accent)
    res.obeliskMat.emissiveIntensity = 0.3 + 0.9 * p

    const on = signalAt(t) ? 1 : 0
    signal.current += (on - signal.current) * Math.min(1, delta * 30)
    res.lampMat.color.copy(accent).multiplyScalar(0.12 + signal.current * (0.6 + 1.8 * p))
    lever.current.rotation.z = -0.14 * signal.current

    orbit.current.forEach((m, i) => {
      if (!m) return
      const a = t * 0.7 + (i * Math.PI * 2) / ORBIT
      m.position.set(rx + Math.cos(a) * 0.42, 0.6 + Math.sin(a * 2 + i) * 0.3, rz + Math.sin(a) * 0.42)
      m.rotation.set(t + i, t * 1.4, 0)
    })
  })

  return (
    <group>
      <mesh geometry={hull} material={MAT.hull} castShadow receiveShadow />
      <mesh geometry={soft} material={kit.soft} />
      <mesh geometry={glowStatic} material={kit.glow} />
      {DISK_Y.map((y, i) => (
        <mesh
          key={i}
          ref={(el) => (disks.current[i] = el)}
          geometry={res.disk}
          position={[rx, y, rz]}
          material={[res.diskSide, MAT.hull, MAT.hull]}
        />
      ))}
      <mesh geometry={res.obelisk} position={[ox, 0.08 + 0.725, oz]} material={res.obeliskMat} castShadow />
      <group ref={lever} position={[tx + 0.12, 0.11, tz]}>
        <mesh position={[-0.11, 0, 0]} material={MAT.shutter}>
          <boxGeometry args={[0.22, 0.018, 0.04]} />
        </mesh>
        <mesh position={[-0.2, 0.02, 0]} material={MAT.hull}>
          <cylinderGeometry args={[0.025, 0.025, 0.02, 8]} />
        </mesh>
      </group>
      <mesh geometry={res.lamp} position={[tx + 0.18, 0.58, tz - 0.08]} material={res.lampMat} />
      {Array.from({ length: ORBIT }, (_, i) => (
        <mesh key={i} ref={(el) => (orbit.current[i] = el)} material={kit.glow}>
          <boxGeometry args={[0.03, 0.03, 0.03]} />
        </mesh>
      ))}
    </group>
  )
}
