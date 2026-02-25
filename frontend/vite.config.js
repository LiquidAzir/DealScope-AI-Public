import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/analyze': {
        target: 'http://localhost:8000',
        changeOrigin: false,
        timeout: 0,           // no proxy timeout — SSE runs for minutes
        proxyTimeout: 0,      // no backend response timeout
      },
      '/health': 'http://localhost:8000',
    },
  },
})
