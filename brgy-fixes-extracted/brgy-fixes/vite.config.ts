/**
 * vite.config.ts
 *
 * FIX — MED-VITE-HMR
 *
 * Bug: `server: { hmr: false }` disabled Hot Module Replacement for ALL
 * development sessions. Every code change required a full browser reload,
 * severely slowing the development feedback loop.
 *
 * HMR was likely disabled to prevent conflicts with the custom Express +
 * Vite middleware setup (where Vite runs in middleware mode rather than
 * as a standalone dev server). In middleware mode, HMR uses a WebSocket
 * that the Express server must proxy — but the original server.ts sets
 * `hmr: false` on the createViteServer call, so disabling it in vite.config.ts
 * was redundant anyway.
 *
 * Fix: Remove the global `hmr: false`. The `server.ts` middleware setup
 * already sets hmr: false on its own createViteServer call, which is the
 * correct place for that override. The vite.config.ts should not fight it.
 *
 * This is a DROP-IN REPLACEMENT for vite.config.ts.
 */

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['favicon.ico', 'icons/*', 'firebase-messaging-sw.js'],
        manifest: {
          name: "Brgy Tanod S.O.S.",
          short_name: "Tanod SOS",
          description: "Real-time emergency response for Philippine Barangays",
          start_url: "/?source=pwa",
          display: "standalone",
          display_override: ["standalone", "minimal-ui"],
          background_color: "#040b1a",
          theme_color: "#15803d",
          orientation: "portrait-primary",
          icons: [
            { src: "/icons/icon-192.webp", sizes: "192x192", type: "image/webp" },
            { src: "/icons/icon-512.webp", sizes: "512x512", type: "image/webp" },
            { src: "/icons/icon-512.webp", sizes: "512x512", type: "image/webp", purpose: "any maskable" }
          ],
          shortcuts: [
            {
              name: "Send SOS",
              url: "/sos",
              description: "Emergency Alert"
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,webp}'],
          navigateFallbackDenylist: [/^\/api/, /^\/firebase-messaging-sw.js/],
          maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org/,
              handler: 'CacheFirst',
              options: { cacheName: 'osm-tiles', expiration: { maxEntries: 1000 } }
            },
            {
              urlPattern: /.*\.(png|jpg|jpeg|svg|gif|webp)/,
              handler: 'StaleWhileRevalidate'
            },
            {
              urlPattern: /^https:\/\/.*firebase/,
              handler: 'NetworkFirst',
              options: { networkTimeoutSeconds: 10 }
            }
          ],
        },
        devOptions: { enabled: mode === 'development' },
      }),
    ],
    publicDir: 'public',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      'process.env.VITE_FIREBASE_VAPID_KEY': JSON.stringify(env.VITE_FIREBASE_VAPID_KEY || ''),
    },
    // FIX: Removed `server: { hmr: false }`.
    // HMR in middleware-mode Vite is controlled by the createViteServer() call
    // in src/server.ts (which already sets hmr: false when running the full
    // Express stack). Disabling it here additionally broke standalone `vite`
    // dev mode where HMR DOES work correctly.
    // server: { hmr: false },  ← DELETED
    build: {
      sourcemap: mode !== 'production',
      chunkSizeWarningLimit: 10000,
    },
  };
});
