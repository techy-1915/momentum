import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isAndroid = mode === 'android'

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
        manifest: {
          name: 'Momentum',
          short_name: 'Momentum',
          description: 'Personal Productivity OS — tasks, reminders, focus timer, calendar',
          theme_color: '#7C3AED',
          background_color: '#030712',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          categories: ['productivity', 'utilities'],
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            { src: 'icon.svg',     sizes: 'any',     type: 'image/svg+xml', purpose: 'any' },
          ],
          shortcuts: [
            { name: 'Add Task',    url: '/tasks',    icons: [{ src: 'icon-192.png', sizes: '192x192' }] },
            { name: 'Focus Timer', url: '/timer',    icons: [{ src: 'icon-192.png', sizes: '192x192' }] },
            { name: 'Calendar',    url: '/calendar', icons: [{ src: 'icon-192.png', sizes: '192x192' }] },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: /\/api\//,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'momentum-api',
                networkTimeoutSeconds: 8,
                expiration: { maxEntries: 300, maxAgeSeconds: 86400 * 7 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        devOptions: { enabled: !isAndroid, type: 'module' },
      }),
    ],

    define: {
      // Expose API URL to runtime code
      __API_URL__: JSON.stringify(env.VITE_API_URL || ''),
    },

    server: {
      port: 5173,
      proxy: {
        '/api':    { target: 'http://localhost:8000', changeOrigin: true },
        '/health': { target: 'http://localhost:8000', changeOrigin: true },
      },
    },

    build: {
      // Android APK build → dist/  (Capacitor webDir)
      // Web/PWA build     → ../backend/static_dist
      outDir: isAndroid ? 'dist' : '../backend/static_dist',
      emptyOutDir: true,
    },
  }
})
