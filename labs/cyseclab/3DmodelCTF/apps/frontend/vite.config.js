import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND = process.env.BACKEND_URL ?? 'http://127.0.0.1:8787'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Frontend dan backend terpisah; di dev semua request diteruskan lewat proxy.
    proxy: {
      '/api': BACKEND,
      '/ws': { target: BACKEND.replace(/^http/, 'ws'), ws: true },
    },
  },
  build: {
    chunkSizeWarningLimit: 1800,
  },
})
