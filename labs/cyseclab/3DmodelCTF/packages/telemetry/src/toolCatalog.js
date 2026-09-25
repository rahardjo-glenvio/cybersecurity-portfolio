import { ACTIVITY_KIND as A } from '@lab/shared'

// Hanya proses di katalog ini yang dianggap competition telemetry.
// Proses lain (browser pribadi, chat, dll.) diabaikan sepenuhnya.
export const TOOL_CATALOG = Object.freeze({
  ghidra: { label: 'Ghidra', category: 'reverse-engineering', activity: A.REVERSING },
  gdb: { label: 'GDB', category: 'reverse-engineering', activity: A.REVERSING },
  radare2: { label: 'radare2', category: 'reverse-engineering', activity: A.REVERSING },
  r2: { label: 'radare2', category: 'reverse-engineering', activity: A.REVERSING },
  objdump: { label: 'objdump', category: 'reverse-engineering', activity: A.REVERSING },
  strings: { label: 'strings', category: 'reverse-engineering', activity: A.REVERSING },
  python: { label: 'Python', category: 'cryptography', activity: A.CRYPTO },
  python3: { label: 'Python', category: 'cryptography', activity: A.CRYPTO },
  openssl: { label: 'OpenSSL', category: 'cryptography', activity: A.CRYPTO },
  sage: { label: 'SageMath', category: 'cryptography', activity: A.CRYPTO },
  hashcat: { label: 'hashcat', category: 'cryptography', activity: A.CRYPTO },
  cyberchef: { label: 'CyberChef', category: 'cryptography', activity: A.CRYPTO },
  wireshark: { label: 'Wireshark', category: 'forensics', activity: A.FORENSICS },
  tshark: { label: 'tshark', category: 'forensics', activity: A.FORENSICS },
  volatility: { label: 'Volatility', category: 'forensics', activity: A.FORENSICS },
  vol: { label: 'Volatility', category: 'forensics', activity: A.FORENSICS },
  burpsuite: { label: 'Burp Suite', category: 'web', activity: A.WEB },
  firefox: { label: 'Browser', category: 'web', activity: A.WEB },
  chromium: { label: 'Browser', category: 'web', activity: A.WEB },
  pwntools: { label: 'pwntools', category: 'pwn', activity: A.PWN },
})

// Normalisasi nama proses: ambil basename tanpa path dan ekstensi .exe.
export function classifyProcess(process) {
  if (typeof process !== 'string') return null
  const base = process.split(/[\\/]/).pop().toLowerCase().replace(/\.exe$/, '')
  const tool = TOOL_CATALOG[base]
  return tool ? { tool: base, ...tool } : null
}
