import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  loadEnv(mode, '.', '');

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode)
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            maps: ['leaflet', 'react-leaflet'],
            socket: ['socket.io-client'],
            charts: ['recharts']
          }
        }
      }
    },
    resolve: {
      alias: [{ find: '@', replacement: path.resolve(__dirname, './') }]
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true'
    },
    optimizeDeps: {}
  };
});
