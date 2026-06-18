import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

const isMobileBuild = process.env.VITE_BUILD_TARGET === 'mobile'

// Quando il backend è in riavvio il proxy non raggiunge il target: invece di propagare
// un 500 rumoroso, rispondiamo 503 (Service Unavailable). L'interceptor axios lo ritenta
// automaticamente (è nei RETRY_STATUS_CODES) e la console del browser resta pulita.
const quietProxyError = (proxy) => {
  proxy.on('error', (_err, _req, res) => {
    if (res && !res.headersSent && typeof res.writeHead === 'function') {
      res.writeHead(503, { 'Content-Type': 'application/json', 'Retry-After': '1' })
      res.end(JSON.stringify({ success: false, message: 'Backend in riavvio, riprova tra poco' }))
    }
  })
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: false,
    exclude: ['e2e/**', 'node_modules/**'],
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  plugins: [
    vue(),
    // PWA disabilitata per build mobile Capacitor (il service worker confligge con WebView)
    !isMobileBuild && VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Atlas - Piattaforma Personal Trainer',
        short_name: 'Atlas',
        description: 'Atlas - Piattaforma per Personal Trainer',
        theme_color: '#3B82F6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png'
          },
          {
            src: '/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png'
          },
          {
            src: '/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: '/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png'
          },
          {
            src: '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png'
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 4 // 4 ore (dati generici)
              }
            }
          },
          {
            urlPattern: /\/api\/workouts/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'workout-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 12 // 12 ore (schede allenamento)
              }
            }
          },
          {
            urlPattern: /\/api\/exercises/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'exercise-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 giorni (dati quasi-statici)
              }
            }
          },
          {
            urlPattern: /\/api\/clients\/.*\/workout/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'client-workout-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 4 // 4 ore (dati sensibili cliente)
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    },
    watch: {
      usePolling: true,
      interval: 300
    },
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy) => quietProxyError(proxy)
      },
      '/uploads': {
        target: process.env.VITE_DEV_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy) => quietProxyError(proxy)
      },
      '/socket.io': {
        target: process.env.VITE_DEV_PROXY_TARGET || 'http://localhost:3000',
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV !== 'production',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-charts': ['chart.js'],
          'vendor-utils': ['axios', 'date-fns']
        }
      }
    },
    chunkSizeWarningLimit: 500
  }
})
