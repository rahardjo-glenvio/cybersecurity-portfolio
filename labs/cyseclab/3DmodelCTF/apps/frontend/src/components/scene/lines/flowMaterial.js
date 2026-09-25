import { AdditiveBlending, Color, ShaderMaterial } from 'three'
import { COLORS } from '../../../config/theme'

// Hierarchy visual jalur: yang sedang dikerjakan paling hidup, yang terkunci
// paling tenang. `flow` = kekuatan dash bergerak, `speed` dalam m/detik.
export const FLOW_STATE = {
  LOCKED: { color: COLORS.slate, intensity: 0.5, flow: 0, speed: 0 },
  AVAILABLE: { color: COLORS.cyan, intensity: 1.05, flow: 1, speed: 0.9 },
  ACTIVE: { color: COLORS.blue, intensity: 1.45, flow: 1.35, speed: 1.7 },
  SOLVED: { color: COLORS.green, intensity: 0.85, flow: 0.55, speed: 0.45 },
}

// UV.x = meter sepanjang jalur (dash sama rapat di semua panjang),
// UV.y = 0..1 melintang. Garis tepi + lajur tengah + "komet" bergerak searah
// progression + sweep sekali saat jalur baru terbuka.
export function createFlowMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color() },
      uIntensity: { value: 1 },
      uFlow: { value: 0 },
      uOffset: { value: 0 },
      uSpacing: { value: 2.4 },
      uSweep: { value: -1 },
      uLength: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uFlow;
      uniform float uOffset;
      uniform float uSpacing;
      uniform float uSweep;
      uniform float uLength;
      varying vec2 vUv;

      void main() {
        float across = abs(vUv.y - 0.5) * 2.0;
        float edge = smoothstep(0.76, 0.88, across) * (1.0 - smoothstep(0.96, 1.0, across));
        float lane = 1.0 - smoothstep(0.03, 0.12, across);

        float phase = fract((vUv.x - uOffset) / uSpacing);
        float comet = pow(phase, 9.0) * (1.0 - smoothstep(0.96, 1.0, phase));
        comet *= 1.0 - smoothstep(0.05, 0.3, across);

        float sweep = uSweep < 0.0 ? 0.0 : exp(-pow((vUv.x - uSweep * uLength) / 0.45, 2.0));

        float a = edge * 0.8 + lane * 0.18 + comet * uFlow * 1.5 + sweep * 1.8;
        gl_FragColor = vec4(uColor * uIntensity * a, 1.0);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  })
}
