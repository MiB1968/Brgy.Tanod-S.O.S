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
      'process.env.VITE_FIREBASE_VAPID_KEY': JSON.stringify(env.VITE_FIREBASE_VAPID_KEY || ''),
    },
    server: {
      hmr: false,
    },
    build: {
      sourcemap: mode !== 'production',
      chunkSizeWarningLimit: 10000,
    },
  };
});
