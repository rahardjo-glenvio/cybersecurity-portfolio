// Identitas visual per kategori room (lihat docs/room-decoration.md).
// Accent dipakai untuk props dekorasi saja; status room tetap dibawa trim,
// lantai, dan field supaya hierarchy LOCKED/AVAILABLE/ACTIVE/SOLVED tidak kabur.
export const CATEGORY_STYLE = {
  web: { label: 'Web', accent: '#38bdf8' },
  network: { label: 'Network', accent: '#22d3ee' },
  forensics: { label: 'Forensics', accent: '#a5f3fc' },
  reversing: { label: 'Reversing', accent: '#8b8cf8' },
  crypto: { label: 'Cryptography', accent: '#2dd4bf' },
  privesc: { label: 'Privilege Escalation', accent: '#f0714f' },
  core: { label: 'Core', accent: '#5eead4' },
}

// Nama kategori dari platform CTF -> gaya dekorasi. `pwn` memakai gaya
// Privilege Escalation (eksploitasi untuk masuk ke area terbatas).
const ALIASES = {
  web: 'web',
  network: 'network',
  networking: 'network',
  net: 'network',
  forensics: 'forensics',
  forensic: 'forensics',
  dfir: 'forensics',
  'reverse-engineering': 'reversing',
  reversing: 'reversing',
  reverse: 'reversing',
  rev: 'reversing',
  re: 'reversing',
  cryptography: 'crypto',
  crypto: 'crypto',
  'privilege-escalation': 'privesc',
  privesc: 'privesc',
  pwn: 'privesc',
  exploitation: 'privesc',
}

// Room LOCKED tidak membawa kategori (backend menyembunyikannya), jadi
// hasilnya null sampai room terbuka. Core selalu dikenali dari `type`.
export function categoryKey(room) {
  if (room.type === 'core') return 'core'
  return ALIASES[String(room.category ?? '').toLowerCase()] ?? null
}

// Seberapa "hidup" dekorasi per status: terang/kecepatan animasi.
export const DECOR_POWER = { LOCKED: 0.25, AVAILABLE: 0.8, ACTIVE: 1, SOLVED: 0.6 }
export const DECOR_SPEED = { LOCKED: 0.35, AVAILABLE: 1, ACTIVE: 1.6, SOLVED: 0.6 }
// Core tetap terlihat saat terkunci (tujuan akhir), tapi redup.
export const CORE_POWER = { LOCKED: 0.3, AVAILABLE: 0.75, ACTIVE: 1, SOLVED: 0.95 }
