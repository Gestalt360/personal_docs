import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  test: {
    // Load the Jest‑dom extensions for all tests
    setupFiles: ['src/setupTests.ts'],
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx,js,jsx}'],
  },
  server: {
    port: 5175,
    strictPort: false,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Heavy SDKs are split into separate async chunks
          octokit: ['@octokit/rest'],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/icon-192.png', 'assets/icon-512.png'],
      manifest: {
        name: 'LifeOS Keep',
        short_name: 'LifeOS Keep',
        description: 'LifeOS note-taking with PARA sync, goal tree, habits & projects',
        theme_color: '#50b478',
        background_color: '#f3f4f6',
        display: 'standalone',
        orientation: 'any',
        categories: ['productivity', 'notes'],
        icons: [
          { src: 'assets/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'assets/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        screenshots: [],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,ico,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/tasks\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'google-tasks',
              expiration: { maxEntries: 50 },
            },
          },
        ],
      },
    }),
    electron([
      {
        entry: 'electron/main.ts',
        onstart: (options) => {
          options.startup();
        },
        vite: {
          build: {
            sourcemap: true,
            minify: false,
            outDir: 'dist-electron',
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart: (options) => {
          if (options.reload) options.reload();
        },
        vite: {
          build: {
            sourcemap: true,
            minify: false,
            outDir: 'dist-electron',
          },
        },
      },
    ]),
    renderer(),
  ],
});
