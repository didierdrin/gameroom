// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';
// import { resolve } from 'path';

// // https://vitejs.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   server: {
//     proxy: {
//       // Proxy WebSocket connections
//       '/': {
//         target: 'https://alu-globe-gameroom.onrender.com',
//         changeOrigin: true,
//         ws: true,
//         secure: true, // Ensure HTTPS/WSS is used
//       },
//     },
//   },
//   resolve: {
//     alias: {
//       '@': resolve(__dirname, './src'),
//     },
//   },
//   build: {
//     outDir: 'dist',
//     emptyOutDir: true,
//     rollupOptions: {
//       input: {
//         main: resolve(__dirname, 'index.html'),
//       },
//     },
//   },
// });
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'; 

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
    server: {
        port: 3000,
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
      },
    },
})
