import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { Color, MeshBasicMaterial, MeshStandardMaterial, Vector3 } from 'three'
import { COLORS } from '../../../config/theme'
import { clamp01, easeOutBack, easeOutCubic, envelope, hash } from '../../../utils/anim'

const PARTICLES = 18
const BURST_AT = 0.55
const CYAN = new Color(COLORS.cyan)
const GREEN = new Color(COLORS.green)

// Efek checkpoint: gembok 3D terbuka + burst partikel. `scale` untuk versi mini
// di atas laptop peserta.
export default function UnlockBurst({ t0Ref, position, scale = 1 }) {
  const mats = useMemo(
    () => ({
      body: new MeshStandardMaterial({ color: '#1e293b', emissive: COLORS.cyan, emissiveIntensity: 1, metalness: 0.6, roughness: 0.3, flatShading: true }),
      shackle: new MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.8, roughness: 0.25, flatShading: true }),
      spark: new MeshBasicMaterial({ color: new Color(COLORS.green).multiplyScalar(3), toneMapped: false }),
    }),
    [],
  )
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats])

  // Arah partikel deterministik, condong ke atas.
  const dirs = useMemo(
    () =>
      Array.from({ length: PARTICLES }, (_, i) => {
        const a = (i / PARTICLES) * Math.PI * 2 + hash(i) * 0.4
        return new Vector3(Math.cos(a), 0.6 + hash(i + 9) * 0.9, Math.sin(a)).normalize().multiplyScalar(1.6 + hash(i + 3) * 1.4)
      }),
    [],
  )

  const lock = useRef()
  const shackle = useRef()
  const sparks = useRef([])

  useFrame(({ clock }) => {
    const a = clock.elapsedTime - t0Ref.current
    const g = lock.current
    const active = a >= 0 && a < 3
    g.visible = active

    if (active) {
      const appear = a < 0.35 ? easeOutBack(a / 0.35) : 1
      const leave = a > 2.2 ? easeOutCubic((a - 2.2) / 0.6) : 0
      g.scale.setScalar(Math.max(0.001, appear * (1 - leave) * scale))
      g.position.set(position[0], position[1] + (Math.sin(a * 2.5) * 0.05 + leave * 0.8) * scale, position[2])
      g.rotation.y = Math.sin(a * 1.5) * 0.4

      const open = clamp01((a - 0.35) / 0.4)
      shackle.current.position.y = 0.17 + easeOutCubic(Math.min(1, open * 2)) * 0.09
      shackle.current.rotation.y = -easeOutCubic(clamp01(open * 2 - 1)) * 1.9

      const green = clamp01((a - BURST_AT) / 0.25)
      mats.body.emissive.copy(CYAN).lerp(GREEN, green)
      mats.body.emissiveIntensity = 0.8 + envelope(a - BURST_AT, 0.05, 0.2, 0.8) * 2.5
    }

    const tau = a - BURST_AT
    sparks.current.forEach((s, i) => {
      const life = tau / 1.1
      s.visible = life >= 0 && life <= 1
      if (!s.visible) return
      const d = dirs[i]
      s.position.set(
        position[0] + d.x * tau * scale,
        position[1] + (d.y * tau - 2.2 * tau * tau) * scale,
        position[2] + d.z * tau * scale,
      )
      s.scale.setScalar(Math.max(0.001, (1 - life) * scale))
      s.rotation.set(tau * 6 + i, tau * 4, 0)
    })
  })

  return (
    <>
      <group ref={lock} visible={false}>
        <RoundedBox args={[0.42, 0.34, 0.16]} radius={0.04} smoothness={2} material={mats.body} />
        <mesh position={[0, 0.02, 0.082]} material={mats.shackle}>
          <circleGeometry args={[0.04, 6]} />
        </mesh>
        <mesh position={[0, -0.05, 0.082]} material={mats.shackle}>
          <planeGeometry args={[0.03, 0.08]} />
        </mesh>
        {/* Pivot shackle di kaki kanan */}
        <group ref={shackle} position={[0.12, 0.17, 0]}>
          <mesh position={[0, 0.05, 0]} material={mats.shackle}>
            <cylinderGeometry args={[0.032, 0.032, 0.1, 6]} />
          </mesh>
          <mesh position={[-0.24, 0.03, 0]} material={mats.shackle}>
            <cylinderGeometry args={[0.032, 0.032, 0.06, 6]} />
          </mesh>
          <mesh position={[-0.12, 0.1, 0]} material={mats.shackle}>
            <torusGeometry args={[0.12, 0.032, 6, 12, Math.PI]} />
          </mesh>
        </group>
      </group>

      {dirs.map((_, i) => (
        <mesh key={i} ref={(el) => (sparks.current[i] = el)} material={mats.spark} visible={false}>
          <octahedronGeometry args={[0.055, 0]} />
        </mesh>
      ))}
    </>
  )
}
