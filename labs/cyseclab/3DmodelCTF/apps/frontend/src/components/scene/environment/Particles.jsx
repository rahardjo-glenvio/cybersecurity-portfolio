import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, ShaderMaterial } from 'three'
import { COLORS } from '../../../config/theme'
import { hash } from '../../../utils/anim'

const HEIGHT = 7

// Partikel data halus yang naik perlahan di atas deck: memberi kedalaman
// dan atmosfer dengan satu draw call. Animasi sepenuhnya di GPU.
export default function Particles({ bounds, count = 140 }) {
  const geometry = useMemo(() => {
    const pos = []
    const seed = []
    for (let i = 0; i < count; i++) {
      pos.push(bounds.minX + hash(i * 3.1) * bounds.width, hash(i * 7.7) * HEIGHT, bounds.minZ + hash(i * 5.3) * bounds.depth)
      seed.push(hash(i * 11.9))
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(pos, 3))
    g.setAttribute('seed', new Float32BufferAttribute(seed, 1))
    return g
  }, [bounds, count])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uColor: { value: new Color(COLORS.cyan).multiplyScalar(0.9) } },
        vertexShader: /* glsl */ `
          attribute float seed;
          uniform float uTime;
          varying float vAlpha;
          void main() {
            vec3 p = position;
            p.y = mod(p.y + uTime * (0.12 + seed * 0.18), ${HEIGHT.toFixed(1)});
            p.x += sin(uTime * 0.3 + seed * 40.0) * 0.25;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = (1.5 + seed * 2.5) * 28.0 / -mv.z;
            float edge = smoothstep(0.0, 0.8, p.y) * (1.0 - smoothstep(${(HEIGHT - 1.5).toFixed(1)}, ${HEIGHT.toFixed(1)}, p.y));
            vAlpha = edge * (0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 1.7 + seed * 60.0)));
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          varying float vAlpha;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, d) * vAlpha * 0.5;
            gl_FragColor = vec4(uColor * a, 1.0);
            #include <colorspace_fragment>
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime
  })

  return <points geometry={geometry} material={material} frustumCulled={false} />
}
