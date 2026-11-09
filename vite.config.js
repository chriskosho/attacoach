import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { serviceWorker } from './scripts/sw-plugin.js'

// GitHub Pages serves the app from /attacoach/.
export default defineConfig({
  base: '/attacoach/',
  plugins: [react(), serviceWorker()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: false,
  },
})
