import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  // Base configurabile: '/' in sviluppo e nell'anteprima Artifact, '/BeachIn/'
  // per GitHub Pages (impostato dal workflow via VITE_BASE).
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  build: {
    rollupOptions: {
      // Solo per l'anteprima single-file (VITE_INLINE=1) si forza un unico
      // bundle, così può essere inlinato in un solo file. Tutte le altre build
      // (inclusa GitHub Pages con HashRouter) fanno code-splitting: chunk per
      // pagina + Recharts e heic2any (libheif) caricati solo quando servono.
      output:
        process.env.VITE_INLINE === '1'
          ? { inlineDynamicImports: true }
          : { manualChunks: { charts: ['recharts'] } },
    },
  },
})
