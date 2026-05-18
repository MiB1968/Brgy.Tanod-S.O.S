import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  loadEnv(mode, '.', '');

  return {
    plugins: [react(), tailwindcss()],
    publicDir: 'public',
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode)
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            maps: ['leaflet', 'react-leaflet'],
            socket: ['socket.io-client'],
            charts: ['recharts'],
            vendor: ['zustand', 'date-fns'],
            // Note: do NOT add @mlc-ai/web-llm here — it must stay as
            // native ESM so its internal worker/dynamic-import logic works.
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',

      // Bug 1 Fix (dev server): The COOP/COEP headers we set in app.ts cover
      // production. In dev, Vite's own HTTP server handles requests, so we
      // must also set them here — otherwise SharedArrayBuffer is unavailable
      // during `npm run dev`.
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },

    // ── Bug 3 Fix ────────────────────────────────────────────────────────────
    optimizeDeps: {
      exclude: ['@mlc-ai/web-llm'],
    },
  };
});
