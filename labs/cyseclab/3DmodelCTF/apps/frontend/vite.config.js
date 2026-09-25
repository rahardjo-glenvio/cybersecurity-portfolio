import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND = process.env.BACKEND_URL ?? 'http://127.0.0.1:8787'

// Hosting statis (mis. Artifact claude.ai) membungkus halaman dengan skeleton
// HTML-nya sendiri, jadi build standalone hanya mengeluarkan fragmen:
// title, tag aset, dan isi body.
function htmlFragment() {
  return {
    name: 'html-fragment',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const title = html.match(/<title>[\s\S]*?<\/title>/)?.[0] ?? ''
        const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? ''
        const assets = head.match(/<script\b[\s\S]*?<\/script>|<link\b[^>]*rel="(?:stylesheet|modulepreload)"[^>]*>/g) ?? []
        const body = html.match(/<body>([\s\S]*?)<\/body>/)?.[1].trim() ?? ''
        return [title, ...assets, body].join('\n')
      },
    },
  }
}

// VITE_BRANDING=neutral: logo lokal di src/assets/branding diganti modul
// kosong (`export default null`), jadi tidak ikut ter-bundle walau filenya ada.
function neutralBranding() {
  const VIRTUAL = '\0neutral-branding'
  return {
    name: 'neutral-branding',
    enforce: 'pre',
    resolveId: (source) => (/\/assets\/branding\//.test(source) ? VIRTUAL : null),
    load: (id) => (id === VIRTUAL ? 'export default null' : null),
  }
}

// `--mode standalone`: core backend ikut jalan di browser (tanpa server),
// output berupa file statis dengan path relatif.
export default defineConfig(({ mode }) => {
  const standalone = mode === 'standalone'
  const neutral = loadEnv(mode, process.cwd(), 'VITE_').VITE_BRANDING === 'neutral'
  return {
    plugins: [react(), standalone && htmlFragment(), neutral && neutralBranding()],
    base: standalone ? './' : '/',
    server: {
      port: 5173,
      // Frontend dan backend terpisah; di dev semua request diteruskan lewat proxy.
      proxy: standalone
        ? undefined
        : {
            '/api': BACKEND,
            '/ws': { target: BACKEND.replace(/^http/, 'ws'), ws: true },
          },
    },
    build: {
      outDir: standalone ? 'dist-standalone' : 'dist',
      chunkSizeWarningLimit: 1800,
    },
  }
})
