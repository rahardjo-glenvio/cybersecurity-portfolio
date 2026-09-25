import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Vector3 } from 'three'
import { useLab } from '../../state/store'
import { easeInOutCubic } from '../../utils/anim'

const HOME_TARGET = new Vector3(0, 1.8, -1.2)
const HOME_OFFSET = new Vector3(13, 11.5, 16.5)
const ROOM_OFFSET = new Vector3(4.8, 4.6, 6.6)
const FLY_TIME = 1.2

// Refactor CameraRig lama: orbit bebas + terbang halus ke room terpilih,
// "Reset view" kembali ke tampilan seluruh building.
export default function CameraRig({ team }) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const selectedRoomId = useLab((s) => s.selectedRoomId)
  const resetSeq = useLab((s) => s.viewResetSeq)
  const fly = useRef(null)
  const pending = useRef(null)

  const fit = Math.min(1.5, Math.max(1, 1.5 / (size.width / size.height)))
  const home = useMemo(
    () => ({ target: HOME_TARGET.clone(), position: HOME_TARGET.clone().addScaledVector(HOME_OFFSET, fit) }),
    [fit],
  )

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
      target={HOME_TARGET.toArray()}
      enableDamping
      dampingFactor={0.08}
      minDistance={4}
      maxDistance={45}
      maxPolarAngle={1.45}
    />
  )
}
