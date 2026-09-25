import { AdditiveBlending, Color, DoubleSide, ShaderMaterial, Vector2 } from 'three'

// Force field room LOCKED: grid tipis + scan band yang turun perlahan.
// Additive dan tanpa depth write, jadi murah dan tidak menutupi isi room.
export function createShieldMaterial(color, cells = [6, 3]) {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(color) },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uCells: { value: new Vector2(...cells) },
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
      uniform float uTime;
      uniform float uOpacity;
      uniform vec2 uCells;
      varying vec2 vUv;

      float gridLine(float v, float width) {
        float d = abs(fract(v) - 0.5);
        return smoothstep(0.5 - width, 0.5, d);
      }

      void main() {
        vec2 g = vUv * uCells;
        float grid = max(gridLine(g.x, 0.035), gridLine(g.y, 0.035));
        float scan = exp(-pow((fract(vUv.y + uTime * 0.18) - 0.5) / 0.06, 2.0));
        float a = (0.015 + grid * 0.11 + scan * 0.05) * uOpacity;
        gl_FragColor = vec4(uColor * 1.4, a);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  })
}
