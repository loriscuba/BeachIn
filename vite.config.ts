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
      // Per l'anteprima statica single-file (VITE_ROUTER=hash) si forza un unico
      // bundle, così può essere inlinato in un solo file. La build reale invece
      // fa code-splitting: chunk leggeri per pagina + Recharts a parte.
      output:
        process.env.VITE_ROUTER === 'hash'
          ? { inlineDynamicImports: true }
          : { manualChunks: { charts: ['recharts'] } },
    },
  },
})
