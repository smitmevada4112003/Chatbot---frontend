import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/chat': 'http://127.0.0.1:8000',
      '/products': 'http://127.0.0.1:8000',
      '/orders': 'http://127.0.0.1:8000',
      '/cart': 'http://127.0.0.1:8000',
      '/dashboard': 'http://127.0.0.1:8000',
      '/api': 'http://127.0.0.1:8000',
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
      },
    },
  },
  optimizeDeps: {
    include: ['cookie', 'react-router-dom'],
  },
})
