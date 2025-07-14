import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // WebSocket/Socket.IO
      '/socket.io': {
        target: 'https://alu-globe-gameroom.onrender.com',
        changeOrigin: true,
        ws: true,
      },
      // API routes
      '/': {
        target: 'https://alu-globe-gameroom.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
