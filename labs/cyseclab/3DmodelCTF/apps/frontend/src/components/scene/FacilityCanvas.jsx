import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { useLab } from '../../state/store'
import { ATMOSPHERE, CAMERA } from '../../config/scene'
import { computeLayout, layoutKey } from './layout'
import Backdrop from './environment/Backdrop'
import EnvironmentMap from './environment/EnvironmentMap'
import FacilityDeck from './environment/FacilityDeck'
import BrandBackdrop from './environment/BrandBackdrop'
import Particles from './environment/Particles'
import SceneLighting from './lighting/SceneLighting'
import Facility from './Facility'
import TrackingPoints from './TrackingPoints'
import FxLayer from './FxLayer'
import RoomLabels, { LabelProjector } from './RoomLabels'
import CameraRig from './CameraRig'
import Effects from './Effects'

// Satu canvas untuk satu tim. Tim lain tidak dirender (overview berbentuk tabel).
export default function FacilityCanvas() {
  const team = useLab((s) => s.team)
  const bloom = useLab((s) => s.bloom)
  const key = team ? layoutKey(team) : ''
  // Layout hanya dihitung ulang saat geometri map berubah, bukan tiap snapshot.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const layout = useMemo(() => (team ? computeLayout(team) : null), [key])
  if (!team) return null

  return (
    <>
      <Canvas
        shadows="percentage"
        dpr={[1, 1.75]}
        camera={{ fov: CAMERA.fov, near: 0.1, far: 400, position: [14, 13, 18] }}
        gl={{ antialias: true }}
      >
        <Backdrop />
        <EnvironmentMap />
        <SceneLighting layout={layout} team={team} />
        <FacilityDeck layout={layout} />
        <BrandBackdrop layout={layout} />
        <Facility team={team} layout={layout} />
        <Particles bounds={layout.bounds} count={ATMOSPHERE.particles} />
        <TrackingPoints team={team} layout={layout} />
        <FxLayer team={team} />
        <LabelProjector layout={layout} />
        <CameraRig team={team} layout={layout} />
        {bloom && <Effects />}
      </Canvas>
      <RoomLabels team={team} />
    </>
  )
}
