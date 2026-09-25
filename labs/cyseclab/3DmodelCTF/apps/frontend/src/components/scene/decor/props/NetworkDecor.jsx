import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  MeshBasicMaterial,
  Object3D,
  TubeGeometry,
  Vector3,
} from 'three'
import { hash } from '../../../../utils/anim'
import { MAT } from '../../materials'
import { box, cyl, place, useDisposables, useMerged } from '../kit'

const MAST = [-0.5, 0.5] // x, z tiang antena
const HEAD_Y = 1.9
const RINGS = 3
const LEDS = 14
const OFF = new Color('#0b1522')
const _c = new Color()

// NETWORK: relay sinyal. Tiang antena lattice dengan kepala berputar dan
// sapuan sinyal, gelombang ring, switch stack ber-LED, dan paket di kabel.
export default function NetworkDecor({ annex, kit, drive }) {
  const hl = annex.length / 2
  const relay = [hl - 0.15, 0.78]
  const [mx, mz] = MAST

  const curves = useMemo(
    () => [
      new CatmullRomCurve3([new Vector3(mx, 0.03, mz), new Vector3(-0.1, 0.03, 0.34), new Vector3(0.1, 0.05, 0.42)]),
      new CatmullRomCurve3([new Vector3(0.74, 0.05, 0.5), new Vector3(relay[0] - 0.1, 0.03, 0.68), new Vector3(relay[0], 0.05, relay[1])]),
    ],
    [mx, mz, relay[0], relay[1]],
  )

  const hull = useMerged(
    () => [
      box([0.36, 0.05, 0.36], [mx, 0.025, mz]),
      cyl([0.035, 0.05, 1.85, 6], [mx, 0.975, mz]),
      box([0.34, 0.025, 0.025], [mx, 0.7, mz]),
      box([0.025, 0.025, 0.34], [mx, 1.15, mz]),
      box([0.26, 0.025, 0.025], [mx, 1.55, mz]),
      box([0.64, 0.17, 0.34], [0.42, 0.085, 0.45]),
      box([0.56, 0.13, 0.3], [0.42, 0.235, 0.45]),
      cyl([0.025, 0.035, 0.75, 6], [relay[0], 0.375, relay[1]]),
      ...curves.map((c) => new TubeGeometry(c, 20, 0.02, 5, false)),
    ],
    [curves],
  )
  const soft = useMerged(
    () => [
      box([0.03, 0.03, 0.03], [mx - 0.17, 0.7, mz]),
      box([0.03, 0.03, 0.03], [mx + 0.17, 0.7, mz]),
      box([0.03, 0.03, 0.03], [mx, 1.15, mz - 0.17]),
      box([0.03, 0.03, 0.03], [mx, 1.15, mz + 0.17]),
      box([0.6, 0.012, 0.35], [0.42, 0.12, 0.45]), // garis indikator di sela unit
    ],
    [mx, mz],
  )
  const head = useMerged(
    () => [
      cyl([0.055, 0.055, 0.08, 8]),
      cyl([0.15, 0.02, 0.06, 12], [0.1, 0.06, 0], [0, 0, -Math.PI / 2]),
      box([0.14, 0.012, 0.012], [0.17, 0.06, 0]),
      box([0.03, 0.24, 0.1], [-0.08, 0.04, 0]),
    ],
    [],
  )
  const res = useDisposables(
    () => ({
      fan: place(new CircleGeometry(1.0, 10, -0.2, 0.4), [0, 0.06, 0], [-Math.PI / 2, 0, 0]),
      rings: Array.from({ length: RINGS }, () =>
        new MeshBasicMaterial({ transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
      ),
    }),
    [],
  )

  const headRef = useRef()
  const beacon = useRef()
  const relayNode = useRef()
  const ringRefs = useRef([])
  const packets = useRef([])
  const leds = useRef()

  useLayoutEffect(() => {
    const dummy = new Object3D()
    for (let i = 0; i < LEDS; i++) {
      dummy.position.set(0.2 + (i % 7) * 0.073, 0.304, i < 7 ? 0.4 : 0.5)
      dummy.updateMatrix()
      leds.current.setMatrixAt(i, dummy.matrix)
      leds.current.setColorAt(i, OFF)
    }
    leds.current.instanceMatrix.needsUpdate = true
  }, [])

  useFrame(() => {
    const { time: t, power: p, accent } = drive.current
    headRef.current.rotation.y = t * 0.9
    const blink = (Math.sin(t * 5) > 0.2 ? 1 : 0.35) * 0.9
    beacon.current.scale.setScalar(0.6 + blink * 0.5)
    relayNode.current.scale.setScalar(0.7 + 0.4 * (0.5 + 0.5 * Math.sin(t * 3 + 1)))
    ringRefs.current.forEach((m, i) => {
      if (!m) return
      const f = (t * 0.35 + i / RINGS) % 1
      m.scale.setScalar(0.1 + f * 0.45) // maks 0,55 m: tetap di atas annex, tidak menutupi room
      res.rings[i].color.copy(accent).multiplyScalar((1 - f) * 0.7 * p)
    })
    packets.current.forEach((m, i) => {
      if (!m) return
      const f = (t * 0.45 + i * 0.5) % 1
      m.position.copy(curves[i % curves.length].getPointAt(f))
      m.position.y += 0.03
    })
    for (let i = 0; i < LEDS; i++) {
      const on = hash(i * 7.3 + Math.floor(t * (3 + hash(i) * 5))) > 0.4
      leds.current.setColorAt(i, on ? _c.copy(accent).multiplyScalar(0.6 + 1.2 * p) : OFF)
    }
    leds.current.instanceColor.needsUpdate = true
  })

  return (
    <group>
      <mesh geometry={hull} material={MAT.hull} castShadow receiveShadow />
      <mesh geometry={soft} material={kit.soft} />
      <group ref={headRef} position={[mx, HEAD_Y, mz]}>
        <mesh geometry={head} material={kit.lit} />
        <mesh geometry={res.fan} material={kit.pool} />
      </group>
      <mesh ref={beacon} position={[mx, HEAD_Y + 0.14, mz]} material={kit.glow}>
        <octahedronGeometry args={[0.035, 0]} />
      </mesh>
      <mesh ref={relayNode} position={[relay[0], 0.8, relay[1]]} material={kit.glow}>
        <octahedronGeometry args={[0.045, 0]} />
      </mesh>
      {res.rings.map((m, i) => (
        <mesh key={i} ref={(el) => (ringRefs.current[i] = el)} position={[mx, HEAD_Y, mz]} rotation-x={-Math.PI / 2} material={m}>
          <ringGeometry args={[0.92, 1.0, 40]} />
        </mesh>
      ))}
      {curves.map((_, i) => (
        <mesh key={i} ref={(el) => (packets.current[i] = el)} material={kit.glow}>
          <icosahedronGeometry args={[0.03, 0]} />
        </mesh>
      ))}
      <instancedMesh ref={leds} args={[undefined, undefined, LEDS]}>
        <boxGeometry args={[0.035, 0.012, 0.035]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  )
}
