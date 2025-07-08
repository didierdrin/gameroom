import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/socket.io': {
        target: 'https://alu-globe-gameroom.onrender.com',
        ws: true,
      },
      '/': 'https://alu-globe-gameroom.onrender.com',
    },
  },
})
