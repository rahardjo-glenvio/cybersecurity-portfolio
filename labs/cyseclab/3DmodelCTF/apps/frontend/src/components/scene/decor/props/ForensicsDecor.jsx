import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, IcosahedronGeometry, MeshBasicMaterial, Object3D } from 'three'
import { hash } from '../../../../utils/anim'
import { MAT } from '../../materials'
import { box, createFieldMaterial, cyl, scanGridTexture, useDisposables, useMerged } from '../kit'

const TABLE = [0.08, 0.5] // x, z meja scan
const TOP_Y = 0.55
const OFF = new Color('#0b1522')
const _c = new Color()

// FORENSICS: evidence lab. Tumpukan barang bukti bertanda tape, meja scan
// dengan disk inspeksi + hologram, rak arsip berisi media, sapuan scanner.
export default function ForensicsDecor({ annex, kit, drive }) {
  const hl = annex.length / 2
  const shx = hl - 0.26 // pusat rak arsip
  const [tx, tz] = TABLE

  const items = []
  for (let s = 0; s < 3; s++) {
    for (let j = 0; j < 3; j++) {
      const h = 0.12 + hash(s * 3 + j) * 0.08
      items.push({ x: shx - 0.13 + j * 0.13, y: [0.055, 0.415, 0.775][s], h })
    }
  }

  const crates = useMerged(
    () => [
      box([0.46, 0.32, 0.4], [-0.72, 0.16, 0.45]),
      box([0.36, 0.26, 0.32], [-0.7, 0.45, 0.44], [0, 0.18, 0]),
      box([0.3, 0.2, 0.28], [-0.3, 0.1, 0.8], [0, -0.25, 0]),
      ...items.map((it) => box([0.075, it.h, 0.22], [it.x, it.y + it.h / 2, 0.55])),
    ],
    [shx],
  )
  const hull = useMerged(
    () => [
      box([0.2, 0.5, 0.2], [tx, 0.25, tz]),
      box([0.36, 0.04, 0.3], [tx, 0.02, tz]),
      box([0.7, 0.05, 0.46], [tx, TOP_Y - 0.025, tz]),
      box([0.03, 1.12, 0.34], [shx - 0.205, 0.56, 0.55]),
      box([0.03, 1.12, 0.34], [shx + 0.205, 0.56, 0.55]),
      ...[0.04, 0.4, 0.76, 1.12].map((y) => box([0.44, 0.03, 0.34], [shx, y, 0.55])),
    ],
    [shx],
  )
  const soft = useMerged(
    () => [
      box([0.37, 0.03, 0.33], [-0.7, 0.47, 0.44], [0, 0.18, 0]),
      box([0.31, 0.03, 0.29], [-0.3, 0.12, 0.8], [0, -0.25, 0]),
      box([0.72, 0.012, 0.012], [tx, TOP_Y - 0.004, tz + 0.232]),
      box([0.72, 0.012, 0.012], [tx, TOP_Y - 0.004, tz - 0.232]),
    ],
    [],
  )
  const res = useDisposables(
    () => ({
      tape: box([0.47, 0.035, 0.41], [-0.72, 0.2, 0.45]),
      tapeMat: new MeshBasicMaterial({ toneMapped: false }),
      grid: new MeshBasicMaterial({ map: scanGridTexture(), toneMapped: false }),
      curtain: createFieldMaterial({ bands: 5, speed: 0.9, sharp: 5 }),
      holo: new IcosahedronGeometry(0.14, 0),
      holoMat: new MeshBasicMaterial({ wireframe: true, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
      cone: cyl([0.13, 0.05, 0.3, 12]),
      coneMat: new MeshBasicMaterial({ transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
      disc: cyl([0.11, 0.11, 0.014, 20]),
    }),
    [],
  )

  const sweep = useRef()
  const disc = useRef()
  const holo = useRef()
  const leds = useRef()

  useLayoutEffect(() => {
    const dummy = new Object3D()
    items.forEach((it, i) => {
      dummy.position.set(it.x, it.y + it.h + 0.006, 0.55 + 0.08)
      dummy.updateMatrix()
      leds.current.setMatrixAt(i, dummy.matrix)
      leds.current.setColorAt(i, OFF)
    })
    leds.current.instanceMatrix.needsUpdate = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shx])

  useFrame(() => {
    const { time: t, power: p, accent } = drive.current
    sweep.current.position.x = tx + Math.sin(t * 1.1) * 0.22
    disc.current.rotation.y = t * 3
    holo.current.rotation.set(t * 0.4, t * 0.7, 0)
    holo.current.position.y = 0.97 + Math.sin(t * 1.3) * 0.03
    res.tapeMat.color.copy(accent).multiplyScalar(0.3 + p * (0.6 + 0.5 * Math.sin(t * 2.6)))
    res.grid.color.copy(accent).multiplyScalar(0.25 + 0.55 * p)
    res.holoMat.color.copy(accent).multiplyScalar(1.4)
    res.holoMat.opacity = 0.85 * p
    res.coneMat.color.copy(accent)
    res.coneMat.opacity = 0.16 * p
    const u = res.curtain.uniforms
    u.uColor.value.copy(accent)
    u.uTime.value = t
    u.uOpacity.value = 0.6 * p
    items.forEach((_, i) => {
      const on = hash(i * 4.1 + Math.floor(t * (1.5 + hash(i) * 3))) > 0.45
      leds.current.setColorAt(i, on ? _c.copy(accent).multiplyScalar(0.5 + 1.1 * p) : OFF)
    })
    leds.current.instanceColor.needsUpdate = true
  })

  return (
    <group>
      <mesh geometry={crates} material={MAT.rackBody} castShadow receiveShadow />
      <mesh geometry={hull} material={MAT.hull} castShadow receiveShadow />
      <mesh geometry={soft} material={kit.soft} />
      <mesh geometry={res.tape} material={res.tapeMat} />
      <mesh position={[tx, TOP_Y + 0.0015, tz]} rotation-x={-Math.PI / 2} material={res.grid}>
        <planeGeometry args={[0.66, 0.42]} />
      </mesh>
      <mesh ref={disc} geometry={res.disc} position={[tx, TOP_Y + 0.009, tz]} material={MAT.shutter} />
      <mesh geometry={res.cone} position={[tx, TOP_Y + 0.17, tz]} material={res.coneMat} />
      <mesh ref={holo} geometry={res.holo} position={[tx, 0.97, tz]} material={res.holoMat} />
      {/* Scanner: bar tipis di permukaan meja + tirai cahaya yang ikut bergerak */}
      <group ref={sweep} position={[tx, TOP_Y + 0.04, tz]}>
        <mesh material={kit.glow}>
          <boxGeometry args={[0.024, 0.012, 0.44]} />
        </mesh>
        <mesh position={[0, 0.17, 0]} rotation-y={Math.PI / 2} material={res.curtain}>
          <planeGeometry args={[0.44, 0.34]} />
        </mesh>
      </group>
      <instancedMesh ref={leds} args={[undefined, undefined, items.length]}>
        <boxGeometry args={[0.03, 0.01, 0.03]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  )
}
