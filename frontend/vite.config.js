import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'convex-api': path.resolve(__dirname, './src/convexApi'),
    },
  },
  build: {
    // No externals — bundle everything including convex/server
  },
  define: {
    // Ensure VITE_CONVEX_URL is available, with fallback
    'import.meta.env.VITE_CONVEX_URL': JSON.stringify(
      process.env.VITE_CONVEX_URL || 'https://tangible-nightingale-795.convex.cloud'
    ),
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
})
