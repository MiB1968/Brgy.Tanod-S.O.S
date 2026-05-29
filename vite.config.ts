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
        injectRegister: false, // We register manually in main.tsx
        includeAssets: ['favicon.ico', 'icons/*', 'firebase-messaging-sw.js'],
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
          navigateFallbackDenylist: [/^\/api/, /^\/firebase-messaging-sw.js/],
          maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
          runtimeCaching: [
            // Map tiles (aggressive caching)
            {
              urlPattern: /https?:\/\/.*\.(tile\.openstreetmap\.org|tiles\.).*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'map-tiles-v2',
                expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 24 * 60 * 60 }
              }
            },
            // Static assets
            {
              urlPattern: /\.(js|css|png|jpg|jpeg|svg|ico|json|webmanifest)$/,
              handler: 'CacheFirst',
              options: { cacheName: 'static-assets' }
            }
          ],
        },
        devOptions: { enabled: mode === 'development' },
        // Important: Do NOT inject manifest into firebase-messaging-sw.js
        // injectManifest: {
        //   swSrc: 'public/firebase-messaging-sw.js',
        //   swDest: 'dist/firebase-messaging-sw.js'
        // }
      }),
    ],
    publicDir: 'public',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      'process.env.VITE_FIREBASE_VAPID_KEY': JSON.stringify(env.VITE_FIREBASE_VAPID_KEY),
    },
    server: {
      hmr: false,
    },
    build: {
      sourcemap: mode !== 'production',
    },
  };
});
