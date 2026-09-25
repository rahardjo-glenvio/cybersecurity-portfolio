import { Canvas } from '@react-three/fiber'
import { Grid } from '@react-three/drei'
import { useLab } from '../../state/store'
import { COLORS } from '../../config/theme'
import Facility from './Facility'
import TrackingPoints from './TrackingPoints'
import FxLayer from './FxLayer'
import CameraRig from './CameraRig'
import Effects from './Effects'

// Satu canvas untuk satu tim. Tim lain tidak dirender (overview berbentuk tabel).
export default function FacilityCanvas() {
  const team = useLab((s) => s.team)
  const bloom = useLab((s) => s.bloom)
  if (!team) return null

  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [13, 13, 15], fov: 42, near: 0.1, far: 200 }} gl={{ antialias: true }}>
      <color attach="background" args={[COLORS.bg]} />
      <fog attach="fog" args={[COLORS.bg, 38, 80]} />
      <hemisphereLight args={['#7d9bff', '#0a0f1a', 1.0]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[8, 16, 10]} intensity={1.5} color="#d6e4ff" />
      <pointLight position={[0, 9, -8]} color={COLORS.cyan} intensity={40} distance={24} decay={2} />
      <pointLight position={[-10, 5, 8]} color={COLORS.blue} intensity={30} distance={22} decay={2} />

      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color={COLORS.floor} roughness={0.9} metalness={0.2} />
      </mesh>
      <Grid
        position={[0, 0, 0]}
        args={[80, 80]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#10273b"
        sectionSize={4}
        sectionThickness={1}
        sectionColor="#1c5474"
        fadeDistance={60}
        fadeStrength={1.2}
      />

      <Facility team={team} />
      <TrackingPoints team={team} />
      <FxLayer team={team} />
      <CameraRig team={team} />
      {bloom && <Effects />}
    </Canvas>
  )
}
