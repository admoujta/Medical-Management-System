import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist'
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: ['localhost', '.ngrok-free.app', '.ngrok-free.dev'],
    port: 5173,
    watch: {
      usePolling: true,
      interval: 300
    },
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8001',
        changeOrigin: true
      }
    }
  }
})
