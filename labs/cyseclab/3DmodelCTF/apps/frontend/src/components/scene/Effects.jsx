import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { POST } from '../../config/scene'

// Post-processing ringan: bloom hanya menangkap emissive (> ~1), vignette
// tipis untuk fokus tanpa mematikan pojok stage, lalu tone mapping ACES.
export default function Effects() {
  const { bloom, vignette } = POST
  return (
    <EffectComposer multisampling={4}>
      <Bloom mipmapBlur luminanceThreshold={bloom.threshold} luminanceSmoothing={bloom.smoothing} intensity={bloom.intensity} radius={bloom.radius} />
      <Vignette offset={vignette.offset} darkness={vignette.darkness} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
