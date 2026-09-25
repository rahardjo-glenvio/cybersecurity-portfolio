import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, DoubleSide, MeshBasicMaterial, MeshStandardMaterial } from 'three'
import { CATEGORY_STYLE, DECOR_POWER, DECOR_SPEED, categoryKey } from '../../../config/categories'
import { COLORS, SURFACE } from '../../../config/theme'
import { damp } from '../../../utils/anim'
import { FLOOR_H, WALL_H } from '../layout'
import { MAT } from '../materials'
import { box, fadeTexture, radialTexture, useDisposables, useMerged } from './kit'
import SealedDecor from './props/SealedDecor'
import WebDecor from './props/WebDecor'
import NetworkDecor from './props/NetworkDecor'
import ForensicsDecor from './props/ForensicsDecor'
import ReversingDecor from './props/ReversingDecor'
import CryptoDecor from './props/CryptoDecor'
import PrivescDecor from './props/PrivescDecor'

const PROPS = {
  web: WebDecor,
  network: NetworkDecor,
  forensics: ForensicsDecor,
  reversing: ReversingDecor,
  crypto: CryptoDecor,
  privesc: PrivescDecor,
}
const _c = new Color()
const BRACE_DROP = 0.85

// Material dekorasi satu room. Warna = accent kategori, terang = status.
function useDecorKit() {
  return useDisposables(
    () => ({
      glow: new MeshBasicMaterial({ toneMapped: false }), // aksen terang (kena bloom)
      soft: new MeshBasicMaterial({ toneMapped: false }), // aksen redup
      add: new MeshBasicMaterial({ transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false, side: DoubleSide }),
      lit: new MeshStandardMaterial({ color: SURFACE.hull, roughness: 0.4, metalness: 0.45, flatShading: true, emissive: '#000000' }),
      pool: new MeshBasicMaterial({ map: radialTexture(), transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false, side: DoubleSide }),
      spill: new MeshBasicMaterial({ map: fadeTexture(), transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
    }),
    [],
  )
}

// Platform dekorasi di sisi room + props kategori. Room LOCKED belum
// membawa kategori, jadi yang tampil modul tersegel; saat room terbuka
// modul itu turun dan props kategori naik (deploy).
export default function RoomDecor({ room, annex, node }) {
  const key = categoryKey(room)
  const lastKey = useRef(key)
  if (key) lastKey.current = key
  const Props = PROPS[lastKey.current]

  const kit = useDecorKit()
  const drive = useRef({ power: 0, speed: 1, time: 0, deploy: 0, sealed: key ? 0 : 1, accent: new Color(COLORS.slate) })
  const propsGroup = useRef()
  const sealedGroup = useRef()

  const platform = usePlatform(annex, node)

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const d = drive.current
    d.power = damp(d.power, key ? DECOR_POWER[room.status] : 0.2, 3, dt)
    d.speed = damp(d.speed, DECOR_SPEED[room.status], 3, dt)
    d.time += dt * d.speed
    d.accent.lerp(_c.set(key ? CATEGORY_STYLE[key].accent : COLORS.slate), 1 - Math.exp(-dt * 3))
    d.deploy = damp(d.deploy, key ? 1 : 0, 3.2, dt)
    d.sealed = damp(d.sealed, key ? 0 : 1, 3.2, dt)

    const p = d.power
    kit.glow.color.copy(d.accent).multiplyScalar(0.5 + 1.3 * p)
    kit.soft.color.copy(d.accent).multiplyScalar(0.22 + 0.55 * p)
    kit.add.color.copy(d.accent)
    kit.add.opacity = 0.5 * p
    kit.lit.emissive.copy(d.accent)
    kit.lit.emissiveIntensity = 0.1 + 0.5 * p
    kit.pool.color.copy(d.accent).multiplyScalar(0.55 * p)
    kit.spill.color.copy(d.accent).multiplyScalar(0.32 * p)

    for (const [ref, v] of [[propsGroup, d.deploy], [sealedGroup, d.sealed]]) {
      if (!ref.current) continue
      ref.current.visible = v > 0.01
      ref.current.scale.y = Math.max(0.001, v)
    }
  })

  return (
    <group position={annex.origin} rotation-y={annex.rotationY}>
      <mesh geometry={platform.hull} material={MAT.slab} castShadow receiveShadow />
      {platform.braces && <mesh geometry={platform.braces} material={MAT.plinth} castShadow />}
      <mesh geometry={platform.rim} material={kit.soft} />
      {/* Accent "lighting" murah: genangan cahaya di lantai + spill di dinding room */}
      <mesh position={[0, 0.004, annex.depth / 2]} rotation-x={-Math.PI / 2} material={kit.pool} renderOrder={1}>
        <planeGeometry args={[annex.length * 0.96, annex.depth * 0.96]} />
      </mesh>
      <mesh position={[0, WALL_H * 0.47, 0.006]} material={kit.spill} renderOrder={1}>
        <planeGeometry args={[annex.length * 0.9, WALL_H * 0.94]} />
      </mesh>

      <group ref={sealedGroup}>
        <SealedDecor annex={annex} drive={drive} />
      </group>
      <group ref={propsGroup}>{Props && <Props annex={annex} kit={kit} drive={drive} status={room.status} />}</group>
    </group>
  )
}

// Slab platform, rim accent di tepi luar, dan bracing ke plinth untuk room
// elevated (supaya platform tidak melayang).
function usePlatform(annex, node) {
  const { length: L, depth: D } = annex
  const hull = useMerged(() => [box([L, FLOOR_H, D], [0, -FLOOR_H / 2, D / 2])], [L, D])
  const rim = useMerged(
    () => [
      box([L, 0.02, 0.035], [0, 0.01, D - 0.03]),
      box([0.035, 0.02, D - 0.06], [-L / 2 + 0.03, 0.01, D / 2]),
      box([0.035, 0.02, D - 0.06], [L / 2 - 0.03, 0.01, D / 2]),
    ],
    [L, D],
  )
  const drop = Math.min(BRACE_DROP, node.y - 0.1)
  const braces = useMerged(() => {
    if (!annex.elevated || drop < 0.4) return []
    const [z0, y0] = [-annex.plinthGap, -FLOOR_H - drop]
    const [z1, y1] = [D * 0.82, -FLOOR_H]
    const len = Math.hypot(y1 - y0, z1 - z0)
    const tilt = -Math.atan2(y1 - y0, z1 - z0)
    return [-1, 1].flatMap((s) => [
      box([0.07, 0.07, len], [s * L * 0.3, (y0 + y1) / 2, (z0 + z1) / 2], [tilt, 0, 0]),
      box([0.18, 0.12, 0.05], [s * L * 0.3, y0, z0 + 0.025]),
    ])
  }, [L, D, drop, annex.elevated, annex.plinthGap])
  return { hull, rim, braces }
}
