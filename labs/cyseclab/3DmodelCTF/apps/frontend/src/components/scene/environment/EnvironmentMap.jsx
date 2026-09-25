import { Environment, Lightformer } from '@react-three/drei'
import { COLORS } from '../../../config/theme'

// Environment map untuk pantulan material metal. Dibangun dari Lightformer
// dan dirender SEKALI (frames=1): tanpa file HDR, jadi tetap jalan di
// hosting statis dengan CSP ketat, dan tanpa biaya per frame.
export default function EnvironmentMap() {
  return (
    <Environment frames={1} resolution={256}>
      <color attach="background" args={['#03060c']} />
      {/* Softbox atas: highlight lembut di permukaan horizontal */}
      <Lightformer form="rect" intensity={1.6} color="#a9bcff" scale={[16, 7]} position={[0, 12, 0]} rotation-x={Math.PI / 2} />
      {/* Strip cyan & biru: garis pantulan khas cyber di dinding metal */}
      <Lightformer form="rect" intensity={3.2} color={COLORS.cyan} scale={[22, 0.5]} position={[-10, 3.5, 2]} rotation-y={Math.PI / 2} />
      <Lightformer form="rect" intensity={2.2} color={COLORS.blue} scale={[18, 0.7]} position={[10, 5, -4]} rotation-y={-Math.PI / 2} />
      <Lightformer form="ring" intensity={1.6} color={COLORS.teal} scale={5} position={[0, 4, -15]} />
      <Lightformer form="rect" intensity={0.7} color="#ffffff" scale={[12, 2.5]} position={[6, 3, 13]} rotation-y={Math.PI} />
    </Environment>
  )
}
