import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  // @genoffice/i18n and @genoffice/electron-utils ship as TS source — must be bundled
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['@genoffice/i18n', '@genoffice/electron-utils'] })],
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ['@genoffice/i18n', '@genoffice/electron-utils'] })],
  },
  renderer: {
    plugins: [react()],
    // the web builds tools/fetch-graphics-web.mjs puts in public/web/<app>
    publicDir: resolve(__dirname, 'public'),
    server: {
      port: Number(process.env.GRAPHICS_DEV_PORT) || 5182,
      strictPort: Boolean(process.env.GRAPHICS_DEV_PORT),
    },
  },
})
