import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// renderer-only dev server (embedded by shell via GRAPHICS_RENDERER_URL for HMR; no standalone Electron)
export default defineConfig({
  root: 'src/renderer',
  publicDir: resolve(__dirname, 'public'),
  plugins: [react()],
  server: {
    port: Number(process.env.GRAPHICS_DEV_PORT) || 5182,
    strictPort: true,
  },
})
