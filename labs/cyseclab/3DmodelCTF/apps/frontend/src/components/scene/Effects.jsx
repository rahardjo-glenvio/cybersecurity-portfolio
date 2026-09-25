import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

// Post-processing ringan: bloom untuk material emissive (toneMapped=false),
// lalu tone mapping ACES agar warna sama dengan mode tanpa bloom.
export default function Effects() {
  return (
    <EffectComposer multisampling={4}>
      <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.55} radius={0.6} />
      <Vignette offset={0.25} darkness={0.7} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
