import { useEffect, useMemo } from 'react'
import { COLORS } from '../../../config/theme'
import { LOBBY_H, LOBBY_R } from '../layout'
import { MAT, glowMaterial } from '../materials'
import { floorLabelTexture } from './textures'

const OCT = Math.PI / 8

// Lobby / staging: pad oktagon (port corridor di sisi datar), ring spawn,
// dan marking lantai yang terbaca dari kamera utama.
export default function Lobby({ node }) {
  const res = useMemo(
    () => ({
      edge: glowMaterial(COLORS.cyan, 1.1),
      spawn: glowMaterial(COLORS.cyan, 0.7),
      label: floorLabelTexture('LOBBY · STAGING', COLORS.cyan),
    }),
    [],
  )
  useEffect(() => () => Object.values(res).forEach((r) => r.dispose()), [res])

  return (
    <group position={[node.x, 0, node.z]}>
      <mesh position={[0, LOBBY_H / 2, 0]} material={MAT.pad} castShadow receiveShadow>
        <cylinderGeometry args={[LOBBY_R, LOBBY_R + 0.08, LOBBY_H, 8, 1, false, OCT]} />
      </mesh>
      <mesh position={[0, LOBBY_H + 0.004, 0]} rotation-x={-Math.PI / 2} material={res.edge}>
        <ringGeometry args={[LOBBY_R - 0.24, LOBBY_R - 0.18, 8, 1, OCT]} />
      </mesh>
      <mesh position={[0, LOBBY_H + 0.004, 0]} rotation-x={-Math.PI / 2} material={res.spawn}>
        <ringGeometry args={[0.46, 0.5, 40]} />
      </mesh>
      <mesh position={[0, LOBBY_H + 0.005, 1.08]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[2.1, 2.1 / 6.4]} />
        <meshBasicMaterial map={res.label} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}
