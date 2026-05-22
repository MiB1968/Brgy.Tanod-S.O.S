import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  loadEnv(mode, '.', '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'offline-tile.png', 'logo.png', 'icons/*'],
        manifest: {
          short_name: "TanodSOS",
          name: "Barangay Tanod S.O.S.",
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
          ],
          start_url: "/",
          display: "standalone",
          theme_color: "#ef4444",
          background_color: "#040b1a",
          description: "Real-time Emergency Response System for Barangays",
          orientation: "portrait-primary"
        },
        workbox: {
          navigateFallbackDenylist: [/^\/api/],
          maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // 15MB to allow WASM or bundle chunks to be cached
          runtimeCaching: [
            // Aggressive Offline Map Tiles Caching
            {
              urlPattern: /https?:\/\/.*\.(tile\.openstreetmap\.org|tiles\.).*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'map-tiles-v1',
                expiration: {
                  maxEntries: 1500,
                  maxAgeSeconds: 60 * 24 * 60 * 60, // 60 days
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            // Local Images & Assets
            {
              urlPattern: /\.(png|jpg|jpeg|svg|gif|webp|ico)$/,
              handler: 'CacheFirst',
              options: { cacheName: 'assets' }
            }
          ],
        },
        devOptions: { enabled: true },
      }),
    ],
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
      
    },

    // ── Bug 3 Fix ────────────────────────────────────────────────────────────
    optimizeDeps: {
      exclude: ['@mlc-ai/web-llm'],
    },
  };
});
