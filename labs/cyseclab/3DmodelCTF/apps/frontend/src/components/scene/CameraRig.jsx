import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Vector3 } from 'three'
import { useLab } from '../../state/store'
import { CAMERA } from '../../config/scene'
import { easeInOutCubic } from '../../utils/anim'

const ROOM_OFFSET = new Vector3(...CAMERA.roomOffset)
const FLY_TIME = 1.2

// Home view dihitung dari bounds map (bukan hardcode), jadi map lain dan
// ukuran stage apa pun tetap terbingkai. Orbit bebas + terbang halus ke room.
export default function CameraRig({ team, layout }) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const selectedRoomId = useLab((s) => s.selectedRoomId)
  const resetSeq = useLab((s) => s.viewResetSeq)
  const fly = useRef(null)
  const pending = useRef(null)

  const { bounds } = layout
  const aspect = size.width / size.height
  const home = useMemo(() => {
    const target = new Vector3(bounds.fx, CAMERA.targetY, bounds.fz)
    const radius = Math.hypot(bounds.width, bounds.depth) / 2
    const fit = Math.min(1.6, Math.max(1, 1.45 / aspect))
    const distance = (radius / Math.tan(((CAMERA.fov / 2) * Math.PI) / 180)) * CAMERA.fitScale * fit
    const { azimuth: az, elevation: el } = CAMERA
    const dir = new Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el))
    return { target, position: target.clone().addScaledVector(dir, distance), distance }
  }, [bounds, aspect])

  useEffect(() => {
    camera.position.copy(home.position)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera])

  const roomPos = team.rooms.find((r) => r.id === selectedRoomId)?.position3D
  const roomKey = roomPos?.join(',')
  useEffect(() => {
    if (!roomPos) return
    const target = new Vector3(roomPos[0], roomPos[1] + 0.9, roomPos[2])
    pending.current = { target, position: target.clone().add(ROOM_OFFSET) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomId, roomKey])

  useEffect(() => {
    if (resetSeq) pending.current = home
  }, [resetSeq, home])

  useFrame((state) => {
    const controls = state.controls
    if (!controls) return
    const t = state.clock.elapsedTime
    if (pending.current) {
      fly.current = {
        start: t,
        fromPos: camera.position.clone(),
        fromTarget: controls.target.clone(),
        toPos: pending.current.position,
        toTarget: pending.current.target,
      }
      pending.current = null
    }
    const f = fly.current
    if (!f) return
    const k = easeInOutCubic((t - f.start) / FLY_TIME)
    camera.position.lerpVectors(f.fromPos, f.toPos, k)
    controls.target.lerpVectors(f.fromTarget, f.toTarget, k)
    if (k >= 1) fly.current = null
  })

  return (
    <OrbitControls
      makeDefault
      target={home.target.toArray()}
      enableDamping
      dampingFactor={0.08}
      minDistance={4}
      maxDistance={home.distance * 1.8}
      maxPolarAngle={1.32}
    />
  )
}
