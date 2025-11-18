import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          // Optimize emotion
          ['@emotion/babel-plugin', { sourceMap: true, autoLabel: 'always' }],
        ],
      },
    }),
    // Bundle visualization for analysis
    visualizer({
      open: false,
      filename: 'dist/stats.html',
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend/src'),
    },
  },

  build: {
    // Target modern browsers for smaller bundle
    target: 'es2020',

    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug'],
      },
    },

    // Smart chunk splitting strategy
    rollupOptions: {
      output: {
        // Vendor chunks for better caching
        manualChunks: {
          // React and core dependencies
          'react-core': [
            'react',
            'react-dom',
            'react-router-dom',
          ],

          // UI and visualization libraries
          'ui-libs': [
            'recharts',
            'clsx',
            'class-variance-authority',
          ],

          // Date utilities
          'date-utils': [
            'date-fns',
          ],

          // Web3 and blockchain
          'web3-utils': [
            'ethers',
            'web3',
          ],

          // Form and validation
          'form-utils': [
            'zod',
            'react-hook-form',
          ],
        },

        // Optimize common chunks
        chunkFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'polyfills') {
            return '[name].js';
          }
          return 'chunks/[name].[hash].js';
        },

        entryFileNames: '[name].[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];

          if (/png|jpe?g|gif|svg|webp/.test(ext)) {
            return `assets/images/[name].[hash][extname]`;
          } else if (/woff|woff2|eot|ttf|otf/.test(ext)) {
            return `assets/fonts/[name].[hash][extname]`;
          } else if (ext === 'css') {
            return `assets/css/[name].[hash][extname]`;
          }

          return `assets/[name].[hash][extname]`;
        },
      },
    },

    // Code splitting configuration
    chunkSizeWarningLimit: 500,

    // Source maps only in development
    sourcemap: process.env.NODE_ENV === 'development',

    // Report compressed size
    reportCompressedSize: true,

    // Optimize CSS code splitting
    cssCodeSplit: true,
  },

  server: {
    // HMR configuration for fast refresh
    hmr: {
      host: 'localhost',
      port: 5173,
      protocol: 'ws',
    },

    // Enable compression
    middlewareMode: false,
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'recharts',
      'ethers',
      'date-fns',
      'clsx',
      'zod',
    ],

    exclude: [
      'node_modules/.vite',
    ],
  },

  // Performance hints
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
});
