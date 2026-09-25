import { useEffect, useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { LIGHTING } from '../../../config/scene'
import { COLORS, LOCK_COLOR } from '../../../config/theme'

const CORE_TONE = { LOCKED: LOCK_COLOR, SOLVED: COLORS.green }
const BAKE_FRAMES = 90 // ±1,5 detik: cukup untuk animasi shutter/field selesai

// Skema 4 lampu: fill hemisphere, key dingin + shadow, rim teal, accent core.
// Tanpa ambient supaya sisi bayangan tetap punya bentuk.
export default function SceneLighting({ layout, team }) {
  const { bounds } = layout
  const key = useRef()
  const [cx, cz] = [bounds.cx, bounds.cz]
  const reach = Math.hypot(bounds.width, bounds.depth) / 2 + 1.5

  useLayoutEffect(() => {
    const light = key.current
    light.target.position.set(cx, 0, cz)
    light.target.updateMatrixWorld()
    Object.assign(light.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 1, far: 70 })
    light.shadow.camera.updateProjectionMatrix()
  }, [cx, cz, reach])

  const coreRoom = team.rooms.find((r) => r.type === 'core')
  const core = coreRoom && layout.nodes.get(coreRoom.id)
  const { hemisphere: h, key: k, rim, lobby } = LIGHTING
  const statusKey = team.rooms.map((r) => `${r.status}${r.instanceActive ? '+' : ''}`).join()

  return (
    <>
      <hemisphereLight args={[h.sky, h.ground, h.intensity]} />
      <directionalLight
        ref={key}
        position={[cx + k.offset[0], k.offset[1], cz + k.offset[2]]}
        color={k.color}
        intensity={k.intensity}
        castShadow
        shadow-mapSize={[k.shadowMapSize, k.shadowMapSize]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-radius={3}
      />
      <directionalLight position={[cx + rim.offset[0], rim.offset[1], cz + rim.offset[2]]} color={rim.color} intensity={rim.intensity} />
      {core && (
        <pointLight
          position={[core.x, core.floorY + LIGHTING.core.height, core.z]}
          color={CORE_TONE[coreRoom.status] ?? COLORS.cyan}
          intensity={LIGHTING.core.intensity}
          distance={LIGHTING.core.distance}
          decay={2}
        />
      )}
      <pointLight
        position={[layout.lobby.x, lobby.height, layout.lobby.z]}
        color={lobby.color}
        intensity={lobby.intensity}
        distance={lobby.distance}
        decay={2}
      />
      <ShadowBaker version={statusKey} />
    </>
  )
}

// Scene hampir statis: shadow map dirender ulang hanya beberapa frame saat
// mount atau saat status berubah, bukan tiap frame.
function ShadowBaker({ version }) {
  const gl = useThree((s) => s.gl)
  const frames = useRef(BAKE_FRAMES)
  useEffect(() => {
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
  }, [gl])
  useEffect(() => {
    frames.current = BAKE_FRAMES
  }, [version])
  useFrame(() => {
    if (frames.current <= 0) return
    frames.current -= 1
    gl.shadowMap.needsUpdate = true
  })
  return null
}
