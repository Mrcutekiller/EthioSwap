import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'convex-api': path.resolve(__dirname, '../convex/_generated/api'),
    },
  },
  build: {
    rollupOptions: {
      external: ['convex/server'],
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
})
