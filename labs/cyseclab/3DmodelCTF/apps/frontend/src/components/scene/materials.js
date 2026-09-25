import { Color, MeshBasicMaterial, MeshStandardMaterial } from 'three'
import { SURFACE } from '../../config/theme'

// Material permukaan dipakai bersama seluruh scene (dibuat sekali).
// Metalness sedang + environment map memberi pantulan strip cyan yang halus;
// flatShading menjaga karakter low-poly.
const standard = (color, roughness, metalness, extra = {}) =>
  new MeshStandardMaterial({ color, roughness, metalness, flatShading: true, envMapIntensity: 1, ...extra })

export const MAT = {
  hull: standard(SURFACE.hull, 0.46, 0.38), // dinding, pilar, kusen
  slab: standard(SURFACE.slab, 0.55, 0.3), // lantai room
  plinth: standard(SURFACE.plinth, 0.66, 0.3), // struktur penyangga
  bridge: standard(SURFACE.bridge, 0.5, 0.35), // deck corridor
  pylon: standard(SURFACE.hull, 0.5, 0.4),
  pad: standard(SURFACE.slab, 0.55, 0.35), // lobby & cluster pad
  shutter: standard(SURFACE.shutter, 0.28, 0.8, { envMapIntensity: 1.3 }),
  rackBody: standard(SURFACE.rack, 0.45, 0.45),
  rackUnit: standard(SURFACE.rackUnit, 0.42, 0.45),
}

// Emissive untuk bloom: nilai > 1 ditangkap bloom (threshold ~1).
export const glowColor = (hex, intensity = 1) => new Color(hex).multiplyScalar(intensity)

export const glowMaterial = (hex, intensity = 1, extra = {}) =>
  new MeshBasicMaterial({ color: glowColor(hex, intensity), toneMapped: false, ...extra })
