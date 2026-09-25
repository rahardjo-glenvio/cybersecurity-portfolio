import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  EdgesGeometry,
  LineBasicMaterial,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three'
import { COLORS, LOCK_COLOR, ROOM_STATUS_COLOR, SURFACE } from '../../config/theme'
import { damp } from '../../utils/anim'
import { FLOOR_H, OPENING_W, PILLAR, SIDES, WALL_H, WALL_T } from './layout'
import { MAT } from './materials'
import { mergeAll, mergeBoxes, rectFrame, box } from './geometry'
import { createShieldMaterial } from './fx/shieldMaterial'

const OCT = Math.PI / 8 // oktagon: vertex di 22.5° + k·45°, sisi datar di k·45°
const TRIM_H = 0.03
const TRIM_W = WALL_T * 0.55 // garis neon di atas dinding, lebih tipis dari dinding
const PILLAR_H = WALL_H + 0.08
const SHIELD_PAD = 0.13
const SHUTTER_H = WALL_H - 0.1 // di bawah lintel + lampu gerbang
const CORE_PILLAR_R = 1.72
const CORE_CENTER_Y = FLOOR_H + 1.45 // kristal & ring
const DOME_STRETCH = 1.2
const _c = new Color()

// Kecerahan trim per status: yang perlu perhatian paling terang.
const TRIM_LEVEL = { LOCKED: 0.4, AVAILABLE: 1.3, ACTIVE: 1.35, SOLVED: 1.0 }

function useStatusMaterials(shieldCells) {
  const m = useMemo(
    () => ({
      trim: new MeshBasicMaterial({ toneMapped: false }),
      line: new MeshBasicMaterial({ transparent: true, toneMapped: false }),
      glow: new MeshBasicMaterial({ transparent: true, opacity: 0.12, depthWrite: false, toneMapped: false }),
      shield: createShieldMaterial(LOCK_COLOR, shieldCells),
      edge: new LineBasicMaterial({ color: LOCK_COLOR, transparent: true, toneMapped: false }),
      lock: new MeshBasicMaterial({ color: new Color(LOCK_COLOR).multiplyScalar(2), toneMapped: false }),
      check: new MeshBasicMaterial({ color: new Color(COLORS.green).multiplyScalar(2.2), toneMapped: false }),
      scan: new MeshBasicMaterial({ transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false, side: DoubleSide }),
      shutter: new MeshStandardMaterial({ color: SURFACE.shutter, roughness: 0.3, metalness: 0.8, emissive: LOCK_COLOR, emissiveIntensity: 0 }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  useEffect(() => () => Object.values(m).forEach((x) => x.dispose()), [m])
  return m
}

// Animasi status bersama (room biasa & core): trim, glow, field, gembok, shutter.
function useStatusAnimation(status, selected, m, refs) {
  const s = useRef({ locked: status === 'LOCKED' ? 1 : 0, solved: status === 'SOLVED' ? 1 : 0, sel: 0, color: new Color(ROOM_STATUS_COLOR[status]) })
  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = clock.elapsedTime
    const a = s.current
    a.locked = damp(a.locked, status === 'LOCKED' ? 1 : 0, 2.5, dt)
    a.solved = damp(a.solved, status === 'SOLVED' ? 1 : 0, 3, dt)
    a.sel = damp(a.sel, selected ? 1 : 0, 6, dt)
    a.color.lerp(_c.set(ROOM_STATUS_COLOR[status]), 1 - Math.exp(-dt * 4))
    const pulse = status === 'ACTIVE' ? 0.5 + 0.5 * Math.sin(t * 3) : 0

    m.trim.color.copy(a.color).multiplyScalar(TRIM_LEVEL[status] + pulse * 0.7 + a.sel * 0.8)
    m.line.color.copy(a.color).multiplyScalar(0.9 + a.sel * 0.6)
    m.line.opacity = 0.35 + (1 - a.locked) * 0.35 + a.sel * 0.3
    m.glow.color.copy(a.color)
    m.glow.opacity = 0.03 + (1 - a.locked) * 0.07 + pulse * 0.1 + a.sel * 0.06
    m.shield.uniforms.uTime.value = t
    m.shield.uniforms.uOpacity.value = a.locked
    m.edge.opacity = 0.3 * a.locked
    m.shutter.emissiveIntensity = 0.1 * a.locked

    const shown = (ref, v) => {
      if (!ref.current) return
      ref.current.visible = v > 0.01
      ref.current.scale.setScalar(Math.max(0.001, v))
    }
    if (refs.shield.current) {
      refs.shield.current.visible = a.locked > 0.01
      refs.shield.current.scale.y = Math.max(0.001, a.locked)
    }
    shown(refs.lock, a.locked)
    shown(refs.check, a.solved)
    refs.lock.current.rotation.y += dt * 0.8
    refs.check.current.rotation.y += dt * 0.9
    for (const sh of refs.shutters ?? []) if (sh) sh.scale.y = Math.max(0.001, a.locked)
    if (refs.scan?.current) {
      refs.scan.current.visible = status === 'ACTIVE'
      refs.scan.current.position.y = FLOOR_H + 0.1 + (0.5 + 0.5 * Math.sin(t * 1.6)) * (WALL_H - 0.2)
      m.scan.color.copy(a.color).multiplyScalar(1.4)
      m.scan.opacity = 0.35
    }
  })
}

function Lock({ lockRef, material, y }) {
  return (
    <group ref={lockRef} position={[0, y, 0]}>
      <mesh material={material}>
        <boxGeometry args={[0.38, 0.3, 0.12]} />
      </mesh>
      <mesh position={[0, 0.16, 0]} material={material}>
        <torusGeometry args={[0.12, 0.035, 6, 12, Math.PI]} />
      </mesh>
    </group>
  )
}

function Check({ checkRef, material, y }) {
  return (
    <group ref={checkRef} position={[0, y, 0]}>
      <mesh position={[-0.1, -0.02, 0]} rotation-z={Math.PI / 4} material={material}>
        <boxGeometry args={[0.07, 0.26, 0.07]} />
      </mesh>
      <mesh position={[0.08, 0.06, 0]} rotation-z={-Math.PI / 5} material={material}>
        <boxGeometry args={[0.07, 0.5, 0.07]} />
      </mesh>
    </group>
  )
}

function useDisposable(factory, deps) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(factory, deps)
  useEffect(
    () => () => Object.values(value).forEach((g) => g?.dispose?.()),
    [value],
  )
  return value
}

const pointer = {
  onPointerOver: (e) => {
    e.stopPropagation()
    document.body.style.cursor = 'pointer'
  },
  onPointerOut: () => {
    document.body.style.cursor = ''
  },
}

export default function RoomModule({ room, node, selected, onSelect }) {
  const props = {
    room,
    node,
    selected,
    onClick: (e) => {
      e.stopPropagation()
      onSelect(room.id)
    },
  }
  return room.type === 'core' ? <CoreModule {...props} /> : <StandardRoom {...props} />
}

// ---------- Room standar ----------

// Dinding per sisi dengan opening tepat di port corridor. Pilar sudut menutup
// sambungan dinding (tanpa volume yang saling tumpang di sudut).
function buildRoomGeometry({ w, d, y, ports }) {
  const hull = []
  const trim = []
  const openings = []
  const top = FLOOR_H + WALL_H

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const [px, pz] = [sx * (w / 2 - PILLAR / 2), sz * (d / 2 - PILLAR / 2)]
      hull.push([PILLAR, PILLAR_H, PILLAR, px, FLOOR_H + PILLAR_H / 2, pz])
      trim.push([PILLAR - 0.04, TRIM_H, PILLAR - 0.04, px, FLOOR_H + PILLAR_H + TRIM_H / 2, pz])
    }
  }

  for (const [side, [nx, nz]] of Object.entries(SIDES)) {
    const alongX = nz !== 0
    const half = (alongX ? w : d) / 2
    const line = (alongX ? d : w) / 2 - WALL_T / 2
    // [panjang, tebal, tinggi] di sepanjang sisi -> box lokal room
    const place = (at, len, thick, height, yc) =>
      alongX ? [len, height, thick, at, yc, nz * line] : [thick, height, len, nx * line, yc, at]

    const here = ports.filter((p) => p.side === side).sort((a, b) => a.t - b.t)
    let start = -half + PILLAR - 0.004
    const segments = []
    for (const p of here) {
      if (p.t - OPENING_W / 2 > start) segments.push([start, p.t - OPENING_W / 2])
      start = p.t + OPENING_W / 2
    }
    if (half - PILLAR + 0.004 > start) segments.push([start, half - PILLAR + 0.004])

    for (const [a0, a1] of segments) {
      if (a1 - a0 < 0.02) continue
      const mid = (a0 + a1) / 2
      hull.push(place(mid, a1 - a0, WALL_T, WALL_H, FLOOR_H + WALL_H / 2))
      trim.push(place(mid, a1 - a0, TRIM_W, TRIM_H, top + TRIM_H / 2))
    }
    for (const p of here) {
      for (const e of [-1, 1]) {
        hull.push(place(p.t + e * (OPENING_W / 2 + 0.03), 0.06, WALL_T + 0.03, WALL_H, FLOOR_H + WALL_H / 2))
      }
      trim.push(place(p.t, OPENING_W - 0.04, WALL_T, 0.012, FLOOR_H + 0.006)) // ambang pintu
      // Portal: lintel (trim status di atasnya) + lampu gerbang di bawahnya, jadi
      // jalur terlihat masuk ke soket room, bukan ke celah dinding.
      hull.push(place(p.t, OPENING_W + 0.12, WALL_T + 0.03, 0.08, FLOOR_H + WALL_H - 0.04))
      trim.push(place(p.t, OPENING_W + 0.12, TRIM_W, TRIM_H, top + TRIM_H / 2))
      trim.push(place(p.t, OPENING_W - 0.1, WALL_T * 0.5, 0.014, FLOOR_H + WALL_H - 0.087))
      openings.push({
        position: alongX ? [p.t, FLOOR_H, nz * line] : [nx * line, FLOOR_H, p.t],
        rotationY: alongX ? 0 : Math.PI / 2,
      })
    }
  }

  let plinth = null
  if (y > 0) {
    const [pw, pd] = [w * 0.86, d * 0.86]
    plinth = box([pw, y, pd, 0, -y / 2, 0])
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) trim.push([0.035, y, 0.035, sx * (pw / 2 + 0.0175), -y / 2, sz * (pd / 2 + 0.0175)])
  }

  const shieldH = FLOOR_H + WALL_H + 0.36
  const shieldBox = new BoxGeometry(w + SHIELD_PAD * 2, shieldH, d + SHIELD_PAD * 2)
  return {
    hull: mergeBoxes(hull),
    trim: mergeBoxes(trim),
    plinth,
    floorLine: rectFrame(w - 0.36, d - 0.36, 0.035),
    shutter: new BoxGeometry(OPENING_W - 0.04, SHUTTER_H, 0.03).translate(0, SHUTTER_H / 2, 0),
    shieldBox,
    shieldEdges: new EdgesGeometry(shieldBox),
    shieldH,
    openings,
  }
}

function StandardRoom({ room, node, selected, onClick }) {
  const { w, d } = node
  const m = useStatusMaterials([5, 2])
  const geo = useDisposable(() => buildRoomGeometry(node), [node])
  const refs = { shield: useRef(), lock: useRef(), check: useRef(), scan: useRef(), shutters: useRef([]).current }
  useStatusAnimation(room.status, selected, m, refs)

  return (
    <group position={[node.x, node.y, node.z]} onClick={onClick} {...pointer}>
      {geo.plinth && <mesh geometry={geo.plinth} material={MAT.plinth} castShadow receiveShadow />}
      <mesh position={[0, FLOOR_H / 2, 0]} material={MAT.slab} castShadow receiveShadow>
        <boxGeometry args={[w, FLOOR_H, d]} />
      </mesh>
      <mesh geometry={geo.hull} material={MAT.hull} castShadow receiveShadow />
      <mesh geometry={geo.trim} material={m.trim} />
      <mesh position={[0, FLOOR_H + 0.004, 0]} rotation-x={-Math.PI / 2} material={m.glow}>
        <planeGeometry args={[w - 0.3, d - 0.3]} />
      </mesh>
      <mesh geometry={geo.floorLine} position={[0, FLOOR_H + 0.006, 0]} material={m.line} />
      {geo.openings.map((o, i) => (
        <group key={i} position={o.position} rotation-y={o.rotationY} ref={(el) => (refs.shutters[i] = el)}>
          <mesh geometry={geo.shutter} material={m.shutter} castShadow />
        </group>
      ))}

      <mesh ref={refs.scan} position={[0, FLOOR_H + 0.3, 0]} rotation-x={-Math.PI / 2} material={m.scan} visible={false}>
        <ringGeometry args={[Math.min(w, d) * 0.3, Math.min(w, d) * 0.34, 32]} />
      </mesh>

      {/* Force field + gembok saat LOCKED, membungkus seluruh modul */}
      <group ref={refs.shield} position={[0, -0.02, 0]}>
        <group position={[0, geo.shieldH / 2, 0]}>
          <mesh geometry={geo.shieldBox} material={m.shield} />
          <lineSegments geometry={geo.shieldEdges} material={m.edge} />
        </group>
      </group>
      <Lock lockRef={refs.lock} material={m.lock} y={FLOOR_H + WALL_H * 0.5} />
      <Check checkRef={refs.check} material={m.check} y={FLOOR_H + WALL_H + 0.5} />
    </group>
  )
}

// ---------- Core ----------

// Menara oktagonal: port corridor di sisi datar, pilar di vertex, kubah
// field lebih besar dari pilar, ring, dan kristal (tidak ada yang menembus).
function buildCoreGeometry({ radius: r, y }) {
  const pillars = []
  const caps = []
  for (let k = 0; k < 8; k++) {
    const a = OCT + (k * Math.PI) / 4
    const [px, pz] = [Math.cos(a) * CORE_PILLAR_R, Math.sin(a) * CORE_PILLAR_R]
    pillars.push([0.2, 1.2, 0.2, px, FLOOR_H + 0.6, pz, -a])
    caps.push([0.22, TRIM_H, 0.22, px, FLOOR_H + 1.2 + TRIM_H / 2, pz, -a])
  }
  const pedestal = new CylinderGeometry(0.42, 0.58, 0.6, 8, 1, false, OCT).translate(0, FLOOR_H + 0.3, 0)

  const trim = caps.map(box)
  let plinth = null
  if (y > 0) {
    const [top, bottom] = [r * 0.72, r * 0.9]
    const at = (h) => bottom - (bottom - top) * (h / y)
    plinth = new CylinderGeometry(top, bottom, y, 8, 1, false, OCT).translate(0, -y / 2, 0)
    for (const f of [0.3, 0.6, 0.9]) {
      const h = f * y
      trim.push(new CylinderGeometry(at(h + 0.03) + 0.014, at(h - 0.03) + 0.014, 0.06, 8, 1, true, OCT).translate(0, h - y, 0))
    }
  }

  const domeR = r - 0.08
  return {
    hull: mergeAll([...pillars.map(box), pedestal]),
    trim: mergeAll(trim),
    plinth,
    dome: new SphereGeometry(domeR, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    domeTop: domeR * DOME_STRETCH,
  }
}

function CoreModule({ room, node, selected, onClick }) {
  const r = node.radius
  const m = useStatusMaterials([16, 5])
  const geo = useDisposable(() => buildCoreGeometry(node), [node])
  const refs = { shield: useRef(), lock: useRef(), check: useRef() }
  useStatusAnimation(room.status, selected, m, refs)

  const crystal = useRef()
  const ring = useRef()
  const crystalMat = useMemo(() => new MeshBasicMaterial({ toneMapped: false }), [])
  useEffect(() => () => crystalMat.dispose(), [crystalMat])
  const breached = room.status === 'SOLVED'

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    crystal.current.rotation.y += dt * (breached ? 2.2 : 0.6)
    crystal.current.position.y = CORE_CENTER_Y + Math.sin(t * 1.5) * 0.1
    ring.current.rotation.z += dt * (breached ? 1.6 : 0.4)
    crystalMat.color.copy(m.trim.color).multiplyScalar(breached ? 1.6 + Math.sin(t * 5) * 0.4 : 1.2)
  })

  return (
    <group position={[node.x, node.y, node.z]} onClick={onClick} {...pointer}>
      {geo.plinth && <mesh geometry={geo.plinth} material={MAT.plinth} castShadow receiveShadow />}
      <mesh position={[0, FLOOR_H / 2, 0]} material={MAT.slab} castShadow receiveShadow>
        <cylinderGeometry args={[r, r, FLOOR_H, 8, 1, false, OCT]} />
      </mesh>
      <mesh position={[0, FLOOR_H + 0.004, 0]} rotation-x={-Math.PI / 2} material={m.glow}>
        <circleGeometry args={[r - 0.25, 8, OCT]} />
      </mesh>
      <mesh position={[0, FLOOR_H + 0.006, 0]} rotation-x={-Math.PI / 2} material={m.trim}>
        <ringGeometry args={[r - 0.17, r - 0.1, 8, 1, OCT]} />
      </mesh>
      <mesh geometry={geo.hull} material={MAT.hull} castShadow receiveShadow />
      <mesh geometry={geo.trim} material={m.trim} />
      <mesh ref={crystal} position={[0, CORE_CENTER_Y, 0]} material={crystalMat}>
        <octahedronGeometry args={[0.5, 0]} />
      </mesh>
      <mesh ref={ring} position={[0, CORE_CENTER_Y, 0]} rotation-x={1.2} material={m.trim}>
        <torusGeometry args={[1.0, 0.03, 4, 48]} />
      </mesh>

      <group ref={refs.shield} position={[0, FLOOR_H, 0]}>
        <group scale={[1, DOME_STRETCH, 1]}>
          <mesh geometry={geo.dome} material={m.shield} />
        </group>
      </group>
      <Lock lockRef={refs.lock} material={m.lock} y={FLOOR_H + geo.domeTop + 0.35} />
      <Check checkRef={refs.check} material={m.check} y={FLOOR_H + 2.4} />
    </group>
  )
}
