import { useEffect, useMemo, useState } from 'react'
import { AdditiveBlending, CanvasTexture, MeshBasicMaterial, MeshStandardMaterial, SRGBColorSpace, TextureLoader } from 'three'
import { BRANDING } from '../../../config/branding'
import { COLORS } from '../../../config/theme'
import { MONO } from '../../../utils/canvas'
import { MAT, glowColor } from '../materials'
import { box, radialTexture, useDisposables, useMerged } from '../decor/kit'
import { DECK_H } from './FacilityDeck'

const W = 4.6 // lebar panel
const H = 5.8 // tinggi panel
const T = 0.4 // tebal panel
const BASE = 0.35
const LOGO_H = 2.4
const LOGO_Y = BASE + H * 0.62
const FACE = T / 2 + 0.012 // sedikit di depan muka panel

// Monolith branding di tengah-belakang arena: panel kaca gelap berbingkai
// tipis dengan logo institusi. Tidak emissive dan terkena fog, jadi tetap
// di bawah room map dalam hierarchy visual.
export default function BrandBackdrop({ layout }) {
  const { x, z } = layout.backdrop
  const logo = useLogoTexture()

  const hull = useMerged(
    () => [
      box([W + 1.3, BASE, 1.4], [0, BASE / 2, 0]),
      box([W, H, T], [0, BASE + H / 2, 0]),
      box([0.3, H + 0.4, 0.7], [-W / 2 - 0.15, BASE + (H + 0.4) / 2, 0.05]),
      box([0.3, H + 0.4, 0.7], [W / 2 + 0.15, BASE + (H + 0.4) / 2, 0.05]),
      box([W + 0.9, 0.18, 0.62], [0, BASE + H + 0.09, 0.05]),
    ],
    [],
  )
  const trim = useMerged(
    () => [
      box([W - 0.5, 0.03, 0.02], [0, BASE + H - 0.3, FACE]),
      box([W - 0.5, 0.03, 0.02], [0, BASE + 0.3, FACE]),
      box([0.03, H - 0.6, 0.02], [-(W / 2 - 0.25), BASE + H / 2, FACE]),
      box([0.03, H - 0.6, 0.02], [W / 2 - 0.25, BASE + H / 2, FACE]),
      box([0.04, H - 0.4, 0.02], [-W / 2 - 0.15, BASE + H / 2, 0.41]),
      box([0.04, H - 0.4, 0.02], [W / 2 + 0.15, BASE + H / 2, 0.41]),
      box([1.8, 0.025, 0.02], [0, LOGO_Y - LOGO_H / 2 - 0.35, FACE]),
    ],
    [],
  )
  const res = useDisposables(
    () => ({
      glass: new MeshStandardMaterial({ color: '#0a1220', roughness: 0.22, metalness: 0.75, envMapIntensity: 1.2 }),
      trim: new MeshBasicMaterial({ color: glowColor(COLORS.cyan, 0.45), toneMapped: false }),
      halo: new MeshBasicMaterial({ map: radialTexture(), color: glowColor(COLORS.cyan, 0.12), transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
    }),
    [],
  )
  const logoMat = useMemo(
    () => logo && new MeshBasicMaterial({ map: logo.texture, color: '#b3bbc7', transparent: true, depthWrite: false }),
    [logo],
  )
  useEffect(() => () => logoMat?.dispose(), [logoMat])

  return (
    <group position={[x, -DECK_H, z]}>
      <mesh geometry={hull} material={MAT.plinth} receiveShadow />
      <mesh position={[0, BASE + H / 2, T / 2 + 0.003]} material={res.glass}>
        <boxGeometry args={[W - 0.6, H - 0.7, 0.01]} />
      </mesh>
      <mesh geometry={trim} material={res.trim} />
      <mesh position={[0, LOGO_Y, FACE + 0.01]} material={res.halo}>
        <planeGeometry args={[LOGO_H * 1.6, LOGO_H * 1.6]} />
      </mesh>
      {logoMat && (
        <mesh position={[0, LOGO_Y, FACE + 0.02]} material={logoMat}>
          <planeGeometry args={[LOGO_H * logo.aspect, LOGO_H]} />
        </mesh>
      )}
    </group>
  )
}

// Logo lokal dari BRANDING (opsional), atau emblem netral bila tidak ada.
function useLogoTexture() {
  const [logo, setLogo] = useState(null)
  useEffect(() => {
    if (!BRANDING.logo) {
      const texture = neutralEmblem()
      setLogo({ texture, aspect: 1 })
      return () => texture.dispose()
    }
    let alive = true
    let loaded = null
    new TextureLoader().load(BRANDING.logo, (texture) => {
      texture.colorSpace = SRGBColorSpace
      texture.anisotropy = 8
      loaded = texture
      if (alive) setLogo({ texture, aspect: texture.image.width / texture.image.height })
      else texture.dispose()
    })
    return () => {
      alive = false
      loaded?.dispose()
    }
  }, [])
  return logo
}

function neutralEmblem() {
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  const hex = (r) => {
    ctx.beginPath()
    for (let k = 0; k < 6; k++) {
      const a = Math.PI / 6 + (k * Math.PI) / 3
      ctx[k ? 'lineTo' : 'moveTo'](S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r)
    }
    ctx.closePath()
  }
  ctx.strokeStyle = '#22d3ee'
  ctx.lineWidth = 14
  hex(230)
  ctx.stroke()
  ctx.lineWidth = 4
  hex(196)
  ctx.stroke()
  ctx.fillStyle = '#e2e8f0'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `800 150px ${MONO}`
  ctx.fillText('CTF', S / 2, S / 2 - 20)
  ctx.font = `700 34px ${MONO}`
  ctx.fillStyle = '#7dd3fc'
  ctx.fillText('PROGRESSION LAB', S / 2, S / 2 + 90)
  const texture = new CanvasTexture(c)
  texture.colorSpace = SRGBColorSpace
  return texture
}
