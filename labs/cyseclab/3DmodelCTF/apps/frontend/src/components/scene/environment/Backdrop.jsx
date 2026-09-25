import { useEffect, useMemo } from 'react'
import { BackSide, Color, ShaderMaterial } from 'three'
import { ATMOSPHERE } from '../../../config/scene'

// Langit gradient + pita horizon tipis, warnanya menyatu dengan fog sehingga
// tepi lantai larut ke kejauhan (tidak ada batas plane yang terlihat).
export default function Backdrop() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uZenith: { value: new Color(ATMOSPHERE.zenith) },
          uHorizon: { value: new Color(ATMOSPHERE.horizon) },
          uFog: { value: new Color(ATMOSPHERE.fog) },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uZenith;
          uniform vec3 uHorizon;
          uniform vec3 uFog;
          varying vec3 vDir;
          void main() {
            float h = vDir.y;
            vec3 col = mix(uHorizon, uZenith, smoothstep(0.0, 0.6, h));
            col += uHorizon * 0.35 * exp(-pow(h / 0.07, 2.0));
            col = mix(col, uFog, smoothstep(0.02, -0.12, h));
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }
        `,
        side: BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])

  return (
    <>
      <color attach="background" args={[ATMOSPHERE.zenith]} />
      <fog attach="fog" args={[ATMOSPHERE.fog, ATMOSPHERE.fogNear, ATMOSPHERE.fogFar]} />
      <mesh material={material} scale={180} renderOrder={-1} frustumCulled={false}>
        <sphereGeometry args={[1, 32, 16]} />
      </mesh>
    </>
  )
}
