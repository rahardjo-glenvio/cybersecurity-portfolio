import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import {
  AdditiveBlending,
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  RingGeometry,
  TorusGeometry,
  Vector3,
} from 'three'
import { CATEGORY_STYLE, CORE_POWER, DECOR_SPEED } from '../../../config/categories'
import { SURFACE } from '../../../config/theme'
import { damp } from '../../../utils/anim'
import { APOTHEM } from '../layout'
import { createFlowMaterial } from '../lines/flowMaterial'
import { MAT } from '../materials'
import { box, cyl, fadeTexture, place, useDisposables, useMerged } from './kit'

const ACCENT = CATEGORY_STYLE.core.accent
const PYLON_R = 3.3
// Busur belakang, tepat di tengah sisi datar oktagon: link energi lewat celah antar pilar.
const PYLON_ANGLES = [225, 270, 315].map((d) => (d * Math.PI) / 180)
const CROWN_R = 1.35
const CROWN_Y = 2.75 // di atas lantai core (kubah LOCKED setinggi 2,66)
const CRYSTAL_Y = 1.45
const FRAGMENTS = 6
const ORBIT_R = 2.7
const BEAM_H = 6
const BEAM_LEVEL = { LOCKED: 0, AVAILABLE: 0.08, ACTIVE: 0.16, SOLVED: 0.3 }

// CORE: objective akhir. Security pylon + link energi, crown ring berputar,
// arus energi naik di sisi menara, fragmen mengorbit, beam vertikal.
export default function CoreDecor({ room, node }) {
  const status = room.status
  const { radius: r, y: towerH, floorY } = node
  const pylonH = floorY + 0.6
  const pylons = useMemo(
    () => PYLON_ANGLES.map((a) => ({ x: Math.cos(a) * PYLON_R, z: Math.sin(a) * PYLON_R, tip: 0.2 + pylonH + 0.22 })),
    [pylonH],
  )

  const hull = useMerged(
    () =>
      pylons.flatMap(({ x, z }) => [
        box([0.7, 0.2, 0.7], [x, 0.1, z]),
        cyl([0.1, 0.24, pylonH, 4, Math.PI / 4], [x, 0.2 + pylonH / 2, z]),
      ]),
    [pylons],
  )
  const soft = useMerged(
    () =>
      pylons.flatMap(({ x, z }) => [
        box([0.4, 0.05, 0.4], [x, 0.2 + pylonH * 0.35, z]),
        box([0.34, 0.05, 0.34], [x, 0.2 + pylonH * 0.7, z]),
      ]),
    [pylons],
  )
  const tips = useMerged(() => pylons.map(({ x, z, tip }) => place(new OctahedronGeometry(0.14, 0), [x, tip, z])), [pylons])
  const crown = useMerged(
    () => [
      new TorusGeometry(CROWN_R, 0.035, 4, 8).rotateX(Math.PI / 2),
      ...Array.from({ length: 8 }, (_, k) => {
        const a = (k * Math.PI) / 4
        return box([0.06, 0.26, 0.06], [Math.cos(a) * CROWN_R, 0.13, Math.sin(a) * CROWN_R])
      }),
    ],
    [],
  )
  const crownTips = useMerged(
    () =>
      Array.from({ length: 8 }, (_, k) => {
        const a = (k * Math.PI) / 4
        return box([0.07, 0.04, 0.07], [Math.cos(a) * CROWN_R, 0.28, Math.sin(a) * CROWN_R])
      }),
    [],
  )

  const res = useDisposables(
    () => ({
      glow: new MeshBasicMaterial({ toneMapped: false }),
      soft: new MeshBasicMaterial({ toneMapped: false }),
      lit: new MeshStandardMaterial({ color: SURFACE.hull, roughness: 0.4, metalness: 0.5, flatShading: true, emissive: ACCENT }),
      rails: createFlowMaterial(),
      railGeo: railGeometry(r, towerH),
      fragment: new OctahedronGeometry(0.09, 0),
      beam: new CylinderGeometry(0.22, 0.05, BEAM_H, 16, 1, true),
      beamMat: new MeshBasicMaterial({ map: fadeTexture(), transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false, side: DoubleSide, color: ACCENT }),
      pulse: new RingGeometry(0.94, 1.0, 64).rotateX(-Math.PI / 2),
      pulseMat: new MeshBasicMaterial({ transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false, color: ACCENT }),
    }),
    [r, towerH],
  )

  const crystal = useMemo(() => new Vector3(0, floorY + CRYSTAL_Y, 0), [floorY])
  const drive = useRef({ power: CORE_POWER[status], speed: 1, time: 0, offset: 0, beam: 0 })
  const crownRef = useRef()
  const fragments = useRef([])
  const pulse = useRef()
  const links = useRef([])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const d = drive.current
    d.power = damp(d.power, CORE_POWER[status], 3, dt)
    d.speed = damp(d.speed, DECOR_SPEED[status], 3, dt)
    d.time += dt * d.speed
    d.offset += dt * d.speed * 0.9
    d.beam = damp(d.beam, BEAM_LEVEL[status], 2, dt)
    const { time: t, power: p } = d
    const breathe = 0.85 + 0.15 * Math.sin(t * 2)

    res.glow.color.set(ACCENT).multiplyScalar((0.5 + 1.0 * p) * breathe)
    res.soft.color.set(ACCENT).multiplyScalar(0.25 + 0.6 * p)
    res.lit.emissiveIntensity = 0.1 + 0.5 * p
    const u = res.rails.uniforms
    u.uColor.value.set(ACCENT)
    u.uIntensity.value = 0.45 + 0.8 * p
    u.uFlow.value = p
    u.uOffset.value = d.offset
    u.uLength.value = 1

    crownRef.current.rotation.y = t * 0.25
    fragments.current.forEach((m, i) => {
      if (!m) return
      const a = t * 0.3 + (i * Math.PI * 2) / FRAGMENTS
      const h = towerH * (0.45 + 0.17 * (i % 3)) + Math.sin(t * 1.2 + i) * 0.12
      m.position.set(Math.cos(a) * ORBIT_R, h, Math.sin(a) * ORBIT_R)
      m.rotation.set(t * 0.8 + i, t * 1.1, 0)
    })

    res.beamMat.opacity = d.beam * (0.8 + 0.2 * Math.sin(t * 3))
    const live = status === 'ACTIVE' || status === 'SOLVED'
    const f = (t * 0.4) % 1
    pulse.current.visible = live
    pulse.current.scale.setScalar(r + 0.15 + f * 1.4)
    res.pulseMat.opacity = (1 - f) * 0.5 * p

    const linkOpacity = status === 'LOCKED' ? 0 : 0.35 + 0.5 * p
    links.current.forEach((line) => {
      if (!line) return
      line.material.opacity = linkOpacity
      line.material.dashOffset -= dt * 1.2
    })
  })

  return (
    <group position={[node.x, 0, node.z]}>
      <mesh geometry={hull} material={MAT.pylon} castShadow receiveShadow />
      <mesh geometry={soft} material={res.soft} />
      <mesh geometry={tips} material={res.glow} />
      <mesh geometry={res.railGeo} material={res.rails} />
      <group ref={crownRef} position={[0, floorY + CROWN_Y, 0]}>
        <mesh geometry={crown} material={res.lit} />
        <mesh geometry={crownTips} material={res.glow} />
      </group>
      {Array.from({ length: FRAGMENTS }, (_, i) => (
        <mesh key={i} ref={(el) => (fragments.current[i] = el)} geometry={res.fragment} material={res.glow} />
      ))}
      <mesh geometry={res.beam} position={[0, floorY + CRYSTAL_Y + 0.5 + BEAM_H / 2, 0]} material={res.beamMat} />
      <mesh ref={pulse} geometry={res.pulse} position={[0, floorY + 0.03, 0]} material={res.pulseMat} />
      {pylons.map((p, i) => (
        <Line
          key={i}
          ref={(el) => (links.current[i] = el)}
          points={[new Vector3(p.x, p.tip, p.z), crystal]}
          color={ACCENT}
          lineWidth={1.6}
          dashed
          dashSize={0.3}
          gapSize={0.18}
          transparent
          opacity={0}
          toneMapped={false}
        />
      ))}
    </group>
  )
}

// Empat strip vertikal di sisi datar menara (0°, 90°, 180°, 270°), mengikuti
// taper plinth. UV.x = meter ke atas supaya shader flow bergerak naik.
function railGeometry(r, towerH) {
  const pos = []
  const uv = []
  const faceR = (h) => (r * 0.9 - (r * 0.9 - r * 0.72) * (h / towerH)) * APOTHEM + 0.012
  const w = 0.07
  for (const deg of [0, 90, 180, 270]) {
    const a = (deg * Math.PI) / 180
    const [nx, nz] = [Math.cos(a), Math.sin(a)]
    const [tx, tz] = [-nz, nx]
    const [h0, h1] = [0.3, towerH - 0.3]
    const b = new Vector3(nx * faceR(h0), h0, nz * faceR(h0))
    const top = new Vector3(nx * faceR(h1), h1, nz * faceR(h1))
    const len = b.distanceTo(top)
    const side = new Vector3(tx, 0, tz).multiplyScalar(w)
    const [bl, br, tl, tr] = [b.clone().sub(side), b.clone().add(side), top.clone().sub(side), top.clone().add(side)]
    // Menghadap keluar dari menara.
    const outward = br.clone().sub(bl).cross(tr.clone().sub(bl)).dot(new Vector3(nx, 0, nz)) > 0
    const tris = outward
      ? [[bl, 0, 0], [br, 0, 1], [tr, len, 1], [bl, 0, 0], [tr, len, 1], [tl, len, 0]]
      : [[bl, 0, 0], [tr, len, 1], [br, 0, 1], [bl, 0, 0], [tl, len, 0], [tr, len, 1]]
    for (const [v, u0, u1] of tris) {
      pos.push(v.x, v.y, v.z)
      uv.push(u0, u1)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.computeVertexNormals()
  return g
}
