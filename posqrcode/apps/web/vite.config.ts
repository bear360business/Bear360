import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Point at the TS entry so Vite never picks up accidental CJS .js next to sources.
      '@bear360/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url),
      ),
    },
  },
  optimizeDeps: {
    exclude: ['@bear360/shared'],
  },
  server: {
    port: 5173,
  },
})

