import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  DoubleSide,
  EdgesGeometry,
  LineBasicMaterial,
  MeshBasicMaterial,
  MeshStandardMaterial,
} from 'three'
import { COLORS, LOCK_COLOR, ROOM_STATUS_COLOR } from '../../config/theme'
import { damp } from '../../utils/anim'
import { roomLabelTexture } from './labels'
import { FLOOR_H } from './markers'

const WALL_H = 1.1
const DOOR_W = 0.9

// Material statis dipakai bersama semua room.
const wallMat = new MeshStandardMaterial({ color: '#101b2e', roughness: 0.5, metalness: 0.5, flatShading: true })
const slabMat = new MeshStandardMaterial({ color: '#0d1627', roughness: 0.6, metalness: 0.4, flatShading: true })
const plinthMat = new MeshStandardMaterial({ color: '#0a111e', roughness: 0.7, metalness: 0.3, flatShading: true })
const doorMat = new MeshStandardMaterial({ color: '#1c2a42', roughness: 0.35, metalness: 0.7 })
const _c = new Color()

function useStatusMaterials() {
  const m = useMemo(
    () => ({
      trim: new MeshBasicMaterial({ toneMapped: false }),
      glow: new MeshBasicMaterial({ transparent: true, opacity: 0.15, depthWrite: false, toneMapped: false }),
      shield: new MeshBasicMaterial({ color: '#334155', transparent: true, opacity: 0.25, depthWrite: false, side: DoubleSide }),
      edge: new LineBasicMaterial({ color: LOCK_COLOR, transparent: true, toneMapped: false }),
      lock: new MeshBasicMaterial({ color: new Color(LOCK_COLOR).multiplyScalar(2), toneMapped: false }),
      check: new MeshBasicMaterial({ color: new Color(COLORS.green).multiplyScalar(2.2), toneMapped: false }),
      scan: new MeshBasicMaterial({ transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false, side: DoubleSide }),
    }),
    [],
  )
  useEffect(() => () => Object.values(m).forEach((x) => x.dispose()), [m])
  return m
}

function useLabel(room) {
  const texture = useMemo(
    () => roomLabelTexture(room),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [room.name, room.status, room.category, room.points],
  )
  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

// Animasi status bersama (room biasa & core): warna trim, shield, lock, check.
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

    m.trim.color.copy(a.color).multiplyScalar((status === 'LOCKED' ? 0.45 : 1.25) + pulse * 0.8 + a.sel * 0.9)
    m.glow.color.copy(a.color)
    m.glow.opacity = 0.04 + (1 - a.locked) * 0.12 + pulse * 0.14 + a.sel * 0.08
    m.shield.opacity = 0.3 * a.locked
    m.edge.opacity = 0.9 * a.locked

    const shield = refs.shield.current
    shield.visible = a.locked > 0.01
    shield.scale.y = Math.max(0.001, a.locked)
    const lock = refs.lock.current
    lock.visible = a.locked > 0.01
    lock.scale.setScalar(Math.max(0.001, a.locked))
    lock.rotation.y += dt * 0.8
    const check = refs.check.current
    check.visible = a.solved > 0.01
    check.scale.setScalar(Math.max(0.001, a.solved))
    check.rotation.y += dt * 0.9
    if (refs.scan?.current) {
      refs.scan.current.visible = status === 'ACTIVE'
      refs.scan.current.position.y = FLOOR_H + 0.1 + (0.5 + 0.5 * Math.sin(t * 1.6)) * (WALL_H - 0.2)
      m.scan.color.copy(a.color).multiplyScalar(1.4)
      m.scan.opacity = 0.35
    }
    if (refs.doors) {
      const open = (1 - a.locked) * (DOOR_W / 2 - 0.02)
      refs.doors[0].current.position.x = -DOOR_W / 4 - open
      refs.doors[1].current.position.x = DOOR_W / 4 + open
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

function useShieldGeometry(w, h, d) {
  const geo = useMemo(() => {
    const boxGeo = new BoxGeometry(w, h, d)
    return { box: boxGeo, edges: new EdgesGeometry(boxGeo) }
  }, [w, h, d])
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo])
  return geo
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

export default function RoomModule({ room, selected, onSelect }) {
  if (room.type === 'core') return <CoreModule room={room} selected={selected} onSelect={onSelect} />
  return <StandardRoom room={room} selected={selected} onSelect={onSelect} />
}

// Room sebagai bagian gedung: plinth (lantai bertingkat), slab, dinding,
// pintu geser, trim status, force field + lock saat LOCKED.
function StandardRoom({ room, selected, onSelect }) {
  const [x, y, z] = room.position3D
  const [w, d] = room.size ?? [3.2, 2.6]
  const m = useStatusMaterials()
  const label = useLabel(room)
  const shieldGeo = useShieldGeometry(w + 0.14, WALL_H + 0.25, d + 0.14)
  const refs = { shield: useRef(), lock: useRef(), check: useRef(), scan: useRef(), doors: [useRef(), useRef()] }
  useStatusAnimation(room.status, selected, m, refs)

  const top = FLOOR_H + WALL_H
  const sideW = (w - DOOR_W) / 2
  return (
    <group
      position={[x, y, z]}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(room.id)
      }}
      {...pointer}
    >
      {y > 0 && (
        <group>
          <mesh position={[0, -y / 2, 0]} material={plinthMat}>
            <boxGeometry args={[w * 0.86, y, d * 0.86]} />
          </mesh>
          {[-1, 1].flatMap((sx) =>
            [-1, 1].map((sz) => (
              <mesh key={`${sx}${sz}`} position={[sx * w * 0.43, -y / 2, sz * d * 0.43]} material={m.trim}>
                <boxGeometry args={[0.04, y, 0.04]} />
              </mesh>
            )),
          )}
        </group>
      )}
      <mesh position={[0, FLOOR_H / 2, 0]} material={slabMat}>
        <boxGeometry args={[w, FLOOR_H, d]} />
      </mesh>
      <mesh position={[0, FLOOR_H + 0.004, 0]} rotation-x={-Math.PI / 2} material={m.glow}>
        <planeGeometry args={[w - 0.3, d - 0.3]} />
      </mesh>

      {/* Dinding: belakang, samping, depan dengan celah pintu */}
      <mesh position={[0, FLOOR_H + WALL_H / 2, -d / 2 + 0.04]} material={wallMat}>
        <boxGeometry args={[w, WALL_H, 0.08]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 - 0.04), FLOOR_H + WALL_H / 2, 0]} material={wallMat}>
          <boxGeometry args={[0.08, WALL_H, d]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`f${s}`} position={[s * (DOOR_W / 2 + sideW / 2), FLOOR_H + WALL_H * 0.3, d / 2 - 0.04]} material={wallMat}>
          <boxGeometry args={[sideW, WALL_H * 0.6, 0.08]} />
        </mesh>
      ))}
      {refs.doors.map((ref, i) => (
        <mesh key={i} ref={ref} position={[(i ? 1 : -1) * (DOOR_W / 4), FLOOR_H + WALL_H * 0.3, d / 2 - 0.02]} material={doorMat}>
          <boxGeometry args={[DOOR_W / 2 - 0.02, WALL_H * 0.6, 0.04]} />
        </mesh>
      ))}

      {/* Trim neon di tepi atas dinding */}
      <mesh position={[0, top, -d / 2 + 0.04]} material={m.trim}>
        <boxGeometry args={[w, 0.035, 0.1]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={`t${s}`} position={[s * (w / 2 - 0.04), top, 0]} material={m.trim}>
          <boxGeometry args={[0.1, 0.035, d]} />
        </mesh>
      ))}
      <mesh position={[0, FLOOR_H + WALL_H * 0.6, d / 2 - 0.04]} material={m.trim}>
        <boxGeometry args={[w, 0.03, 0.1]} />
      </mesh>

      <mesh ref={refs.scan} position={[0, FLOOR_H + 0.3, 0]} rotation-x={-Math.PI / 2} material={m.scan} visible={false}>
        <ringGeometry args={[Math.min(w, d) * 0.3, Math.min(w, d) * 0.34, 32]} />
      </mesh>

      <mesh position={[0, top + 0.42, -d / 2 + 0.06]}>
        <planeGeometry args={[w * 0.95, w * 0.95 * 0.293]} />
        <meshBasicMaterial map={label} transparent toneMapped={false} />
      </mesh>

      {/* Force field + gembok saat LOCKED (dihapus dengan animasi saat unlock) */}
      <group ref={refs.shield} position={[0, FLOOR_H, 0]}>
        <group position={[0, (WALL_H + 0.25) / 2, 0]}>
          <mesh geometry={shieldGeo.box} material={m.shield} />
          <lineSegments geometry={shieldGeo.edges} material={m.edge} />
        </group>
      </group>
      <Lock lockRef={refs.lock} material={m.lock} y={FLOOR_H + WALL_H * 0.6} />
      <Check checkRef={refs.check} material={m.check} y={top + 0.95} />
    </group>
  )
}

// Core: menara oktagonal dengan kristal, dilindungi kubah sampai CORE_UNLOCKED.
function CoreModule({ room, selected, onSelect }) {
  const [x, y, z] = room.position3D
  const r = (room.size?.[0] ?? 4.6) / 2
  const m = useStatusMaterials()
  const label = useLabel(room)
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
    crystal.current.position.y = FLOOR_H + 1.5 + Math.sin(t * 1.5) * 0.12
    ring.current.rotation.z += dt * (breached ? 1.6 : 0.4)
    crystalMat.color.copy(m.trim.color).multiplyScalar(breached ? 1.6 + Math.sin(t * 5) * 0.4 : 1.2)
  })

  return (
    <group
      position={[x, y, z]}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(room.id)
      }}
      {...pointer}
    >
      {y > 0 && (
        <group>
          <mesh position={[0, -y / 2, 0]} material={plinthMat}>
            <cylinderGeometry args={[r * 0.72, r * 0.9, y, 8]} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[Math.cos((i * Math.PI) / 2 + Math.PI / 8) * r * 0.8, -y / 2, Math.sin((i * Math.PI) / 2 + Math.PI / 8) * r * 0.8]} material={m.trim}>
              <boxGeometry args={[0.05, y, 0.05]} />
            </mesh>
          ))}
        </group>
      )}
      <mesh position={[0, FLOOR_H / 2, 0]} material={slabMat}>
        <cylinderGeometry args={[r, r, FLOOR_H, 8]} />
      </mesh>
      <mesh position={[0, FLOOR_H + 0.004, 0]} rotation-x={-Math.PI / 2} material={m.glow}>
        <circleGeometry args={[r - 0.2, 8]} />
      </mesh>
      <mesh position={[0, FLOOR_H + 0.01, 0]} rotation-x={-Math.PI / 2} material={m.trim}>
        <ringGeometry args={[r - 0.12, r - 0.04, 8]} />
      </mesh>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8
        return (
          <mesh key={i} position={[Math.cos(a) * (r - 0.25), FLOOR_H + 0.6, Math.sin(a) * (r - 0.25)]} material={wallMat}>
            <boxGeometry args={[0.18, 1.2, 0.18]} />
          </mesh>
        )
      })}
      <mesh position={[0, FLOOR_H + 0.35, 0]} material={plinthMat}>
        <cylinderGeometry args={[0.45, 0.6, 0.7, 8]} />
      </mesh>
      <mesh ref={crystal} material={crystalMat}>
        <octahedronGeometry args={[0.6, 0]} />
      </mesh>
      <mesh ref={ring} position={[0, FLOOR_H + 1.5, 0]} rotation-x={1.2} material={m.trim}>
        <torusGeometry args={[1.25, 0.03, 4, 48]} />
      </mesh>

      <mesh position={[0, FLOOR_H + 3.1, r * 0.2]}>
        <planeGeometry args={[3.4, 1]} />
        <meshBasicMaterial map={label} transparent toneMapped={false} />
      </mesh>

      <group ref={refs.shield} position={[0, FLOOR_H, 0]}>
        <mesh material={m.shield}>
          <sphereGeometry args={[r * 0.92, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <mesh>
          <sphereGeometry args={[r * 0.93, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshBasicMaterial color={LOCK_COLOR} wireframe transparent opacity={0.35} toneMapped={false} />
        </mesh>
      </group>
      <Lock lockRef={refs.lock} material={m.lock} y={FLOOR_H + r * 0.92 + 0.3} />
      <Check checkRef={refs.check} material={m.check} y={FLOOR_H + 2.5} />
    </group>
  )
}
