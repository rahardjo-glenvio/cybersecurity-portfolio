import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Grid } from '@react-three/drei'
import { ExtrudeGeometry, MeshBasicMaterial, MeshStandardMaterial, Shape, ShapeGeometry } from 'three'
import { COLORS, SURFACE } from '../../../config/theme'
import { MAT, glowColor } from '../materials'
import { mergeBoxes } from '../geometry'
import { blobTexture, deckTextures } from './textures'

export const DECK_H = 0.3 // tebal pelat fasilitas; permukaan atasnya y = 0
const CORNER = 1.4
const BEVEL = 0.05

// Rounded rect di bidang shape (x, -z) karena mesh diputar -90° di X.
function roundedRect(minX, maxX, minZ, maxZ, r) {
  const s = new Shape()
  const [x0, x1, y0, y1] = [minX, maxX, -maxZ, -minZ]
  s.moveTo(x0 + r, y0)
  s.lineTo(x1 - r, y0)
  s.quadraticCurveTo(x1, y0, x1, y0 + r)
  s.lineTo(x1, y1 - r)
  s.quadraticCurveTo(x1, y1, x1 - r, y1)
  s.lineTo(x0 + r, y1)
  s.quadraticCurveTo(x0, y1, x0, y1 - r)
  s.lineTo(x0, y0 + r)
  s.quadraticCurveTo(x0, y0, x0 + r, y0)
  return s
}

function insetRect(b, inset) {
  return roundedRect(b.minX + inset, b.maxX - inset, b.minZ + inset, b.maxZ - inset, Math.max(0.2, CORNER - inset))
}

// Pelat fasilitas di bawah seluruh map + grid lantai di luar pelat.
export default function FacilityDeck({ layout }) {
  const { bounds } = layout
  const res = useMemo(() => {
    const { map, emissiveMap } = deckTextures()
    for (const t of [map, emissiveMap]) t.repeat.set(0.25, 0.25)
    const top = new MeshStandardMaterial({
      map,
      emissiveMap,
      emissive: '#ffffff',
      emissiveIntensity: 0.28,
      roughness: 0.85,
      metalness: 0.3,
      envMapIntensity: 0.6,
    })
    const side = new MeshStandardMaterial({ color: SURFACE.deckSide, roughness: 0.6, metalness: 0.5 })
    const deck = new ExtrudeGeometry(insetRect(bounds, 0), {
      depth: DECK_H - BEVEL * 2,
      bevelEnabled: true,
      bevelThickness: BEVEL,
      bevelSize: BEVEL,
      bevelSegments: 1,
      curveSegments: 6,
    })
    const band = insetRect(bounds, 0.16)
    band.holes.push(insetRect(bounds, 0.22))
    const trim = new ShapeGeometry(band, 6)
    const trimMat = new MeshBasicMaterial({ color: glowColor(COLORS.cyan, 0.5), toneMapped: false })
    const blob = blobTexture()
    const blobMat = new MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false, color: '#000' })
    return { map, emissiveMap, top, side, deck, trim, trimMat, blob, blobMat }
  }, [bounds])
  useEffect(() => () => Object.values(res).forEach((r) => r.dispose?.()), [res])

  return (
    <group>
      <mesh geometry={res.deck} material={[res.top, res.side]} rotation-x={-Math.PI / 2} position={[0, -DECK_H + BEVEL, 0]} receiveShadow />
      <mesh geometry={res.trim} material={res.trimMat} rotation-x={-Math.PI / 2} position={[0, 0.003, 0]} />
      <ContactBlobs layout={layout} material={res.blobMat} />
      <CornerBeacons bounds={bounds} />

      <mesh rotation-x={-Math.PI / 2} position={[0, -DECK_H - 0.002, 0]}>
        <circleGeometry args={[160, 48]} />
        <meshStandardMaterial color={SURFACE.ground} roughness={0.95} metalness={0.1} />
      </mesh>
      <Grid
        position={[0, -DECK_H + 0.001, 0]}
        infiniteGrid
        cellSize={1}
        cellThickness={0.5}
        cellColor="#0f2236"
        sectionSize={4}
        sectionThickness={1}
        sectionColor="#18405e"
        fadeDistance={58}
        fadeStrength={1.4}
      />
    </group>
  )
}

// Tiang beacon di empat sudut deck: membingkai fasilitas, denyut pelan.
function CornerBeacons({ bounds }) {
  const res = useMemo(() => {
    const inset = CORNER * 0.55
    const spots = [
      [bounds.minX + inset, bounds.minZ + inset],
      [bounds.maxX - inset, bounds.minZ + inset],
      [bounds.minX + inset, bounds.maxZ - inset],
      [bounds.maxX - inset, bounds.maxZ - inset],
    ]
    return {
      posts: mergeBoxes(spots.flatMap(([x, z]) => [[0.34, 0.05, 0.34, x, 0.025, z], [0.14, 1.5, 0.14, x, 0.8, z]])),
      caps: mergeBoxes(spots.map(([x, z]) => [0.18, 0.08, 0.18, x, 1.59, z])),
      glow: new MeshBasicMaterial({ toneMapped: false }),
    }
  }, [bounds])
  useEffect(() => () => Object.values(res).forEach((r) => r.dispose()), [res])
  useFrame(({ clock }) => {
    res.glow.color.set(COLORS.cyan).multiplyScalar(1.1 + Math.sin(clock.elapsedTime * 1.4) * 0.6)
  })
  return (
    <group>
      <mesh geometry={res.posts} material={MAT.pylon} castShadow receiveShadow />
      <mesh geometry={res.caps} material={res.glow} />
    </group>
  )
}

// Bayangan kontak di kaki setiap modul (lantai deck), melengkapi shadow map.
function ContactBlobs({ layout, material }) {
  return [...layout.nodes.values()].map((n) => {
    const [w, d] = n.shape === 'rect' ? [n.w, n.d] : [n.radius * 2, n.radius * 2]
    const k = n.y > 0 ? 1.15 : 1.35
    return (
      <mesh key={n.id} rotation-x={-Math.PI / 2} position={[n.x, 0.002, n.z]} material={material} renderOrder={1}>
        <planeGeometry args={[w * k, d * k]} />
      </mesh>
    )
  })
}
