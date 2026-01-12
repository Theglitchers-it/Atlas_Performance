import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Root directory for source files
  root: 'app/static/src',

  // Base public path when served in production
  base: '/static/',

  // Build configuration
  build: {
    // Output directory relative to project root
    outDir: '../../../dist',
    emptyOutDir: true,

    // Generate manifest for Flask integration
    manifest: true,

    rollupOptions: {
      input: {
        main: resolve(__dirname, 'app/static/src/js/main.js'),
        styles: resolve(__dirname, 'app/static/src/css/main.css')
      },
      output: {
        // Output structure
        entryFileNames: 'js/[name].[hash].js',
        chunkFileNames: 'js/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.css')) {
            return 'css/[name].[hash][extname]';
          }
          return 'assets/[name].[hash][extname]';
        }
      }
    },

    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },

    // Source maps for production debugging
    sourcemap: true
  },

  // Development server configuration
  server: {
    port: 5173,
    strictPort: true,
    // Proxy API requests to Flask in development
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    },
    // Enable CORS for development
    cors: true
  },

  // CSS configuration
  css: {
    postcss: './postcss.config.js',
    devSourcemap: true
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ['alpinejs', 'chart.js']
  }
});
