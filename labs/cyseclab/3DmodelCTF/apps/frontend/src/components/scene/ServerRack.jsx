import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, MeshBasicMaterial, Object3D } from 'three'
import { COLORS } from '../../config/theme'
import { damp, hash } from '../../utils/anim'

const UNITS = 7
const LEDS_PER_UNIT = 6
const UNIT_H = 0.2
const UNIT_GAP = 0.06
const FRONT_Z = 0.39

const LED_OFF = new Color('#0d1726')
const LED_PALETTE = [
  new Color(COLORS.green).multiplyScalar(3),
  new Color(COLORS.cyan).multiplyScalar(3),
  new Color(COLORS.teal).multiplyScalar(3),
  new Color(COLORS.amber).multiplyScalar(2.5),
]

const unitY = (i) => 0.28 + i * (UNIT_H + UNIT_GAP)

// Server rack (reuse dari prototype lama) sebagai instance cluster.
// load 0..1: semakin banyak instance aktif, semakin banyak unit menyala.
export default function ServerRack({ position, rotationY = 0, seed = 0, load = 0.2 }) {

  const leds = useRef()
  const fans = useRef([])
  const stripes = useRef([])
  const power = useRef(0)
  const tmp = useMemo(() => new Color(), [])
  const strip = useMemo(() => new MeshBasicMaterial({ color: COLORS.blue, toneMapped: false }), [])
  useEffect(() => () => strip.dispose(), [strip])

  useLayoutEffect(() => {
    const dummy = new Object3D()
    let i = 0
    for (let u = 0; u < UNITS; u++) {
      for (let l = 0; l < LEDS_PER_UNIT; l++) {
        dummy.position.set(0.1 + l * 0.055, unitY(u) + 0.06, FRONT_Z + 0.007)
        dummy.updateMatrix()
        leds.current.setMatrixAt(i, dummy.matrix)
        leds.current.setColorAt(i++, LED_OFF)
      }
    }
    leds.current.instanceMatrix.needsUpdate = true
  }, [])

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    power.current = damp(power.current, 0.25 + load * 0.75, 2, dt)
    const pw = power.current
    const unitsOn = Math.ceil(pw * UNITS)

    let i = 0
    for (let u = 0; u < UNITS; u++) {
      const on = u < unitsOn
      for (let l = 0; l < LEDS_PER_UNIT; l++, i++) {
        if (!on) {
          leds.current.setColorAt(i, LED_OFF)
          continue
        }
        const rate = 2 + hash(i + seed) * (4 + pw * 8)
        const lit = hash(i * 7.3 + seed + Math.floor(t * rate)) > 0.35 || l === 0
        const base = LED_PALETTE[l === 0 ? 0 : Math.floor(hash(i * 3.1 + seed) * LED_PALETTE.length)]
        leds.current.setColorAt(i, lit ? base : LED_OFF)
      }
      stripes.current[u].color.copy(on ? tmp.set(COLORS.teal).multiplyScalar(2) : tmp.set(COLORS.dim))
    }
    leds.current.instanceColor.needsUpdate = true
    fans.current.forEach((fan) => (fan.rotation.z += dt * (2 + pw * 20)))
    strip.color.set(COLORS.teal).multiplyScalar(0.4 + pw * 1.6)
  })

  return (
    <group position={position} rotation-y={rotationY}>
      <mesh position={[0, 1.08, -0.37]}>
        <boxGeometry args={[1.0, 2.16, 0.04]} />
        <meshStandardMaterial color="#0e1626" roughness={0.45} metalness={0.6} />
      </mesh>
      {[-0.475, 0.475].map((x) => (
        <mesh key={x} position={[x, 1.08, 0]}>
          <boxGeometry args={[0.05, 2.16, 0.78]} />
          <meshStandardMaterial color="#0e1626" roughness={0.45} metalness={0.6} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 2.18, 0]}>
        <boxGeometry args={[1.06, 0.06, 0.84]} />
        <meshStandardMaterial color={COLORS.metalLight} roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.07, 0]}>
        <boxGeometry args={[1.0, 0.14, 0.78]} />
        <meshStandardMaterial color="#0e1626" roughness={0.45} metalness={0.6} />
      </mesh>
      {[-0.47, 0.47].map((x) => (
        <mesh key={x} position={[x, 1.08, FRONT_Z + 0.03]} material={strip}>
          <boxGeometry args={[0.025, 1.9, 0.01]} />
        </mesh>
      ))}

      {Array.from({ length: UNITS }, (_, u) => (
        <group key={u} position={[0, unitY(u), 0]}>
          <mesh position={[0, UNIT_H / 2 - 0.02, 0.02]}>
            <boxGeometry args={[0.86, UNIT_H, 0.72]} />
            <meshStandardMaterial color={u % 2 ? '#1b2740' : '#172238'} roughness={0.4} metalness={0.6} flatShading />
          </mesh>
          <mesh position={[0.2, 0.01, FRONT_Z]}>
            <boxGeometry args={[0.32, 0.018, 0.006]} />
            <meshBasicMaterial ref={(el) => (stripes.current[u] = el)} color={COLORS.dim} toneMapped={false} />
          </mesh>
        </group>
      ))}

      <instancedMesh ref={leds} args={[undefined, undefined, UNITS * LEDS_PER_UNIT]}>
        <boxGeometry args={[0.034, 0.034, 0.014]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {[-0.3, -0.08].map((x, k) => (
        <group key={x} position={[x, unitY(UNITS - 1) + 0.08, FRONT_Z + 0.02]}>
          <mesh rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.085, 0.085, 0.01, 8]} />
            <meshStandardMaterial color="#0a111d" />
          </mesh>
          <group ref={(el) => (fans.current[k] = el)} position={[0, 0, 0.008]}>
            {[0, 1, 2, 3].map((b) => (
              <mesh key={b} rotation-z={(b * Math.PI) / 2}>
                <boxGeometry args={[0.14, 0.025, 0.004]} />
                <meshStandardMaterial color="#334155" />
              </mesh>
            ))}
          </group>
        </group>
      ))}
    </group>
  )
}
