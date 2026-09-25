// Logo institusi bersifat opsional dan TIDAK disimpan di repo (repo publik).
// Taruh satu file gambar di src/assets/branding/ (folder itu di-gitignore).
// Tanpa file tersebut, atau saat build dengan VITE_BRANDING=neutral,
// backdrop memakai emblem netral.
const files =
  import.meta.env.VITE_BRANDING === 'neutral'
    ? {} // cabang glob dibuang saat build, termasuk nama file logonya
    : import.meta.glob('../assets/branding/*.{png,webp,svg}', { eager: true, import: 'default' })

export const BRANDING = { logo: Object.values(files)[0] ?? null }
