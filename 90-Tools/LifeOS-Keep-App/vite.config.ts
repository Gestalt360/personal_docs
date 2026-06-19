import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

export default defineConfig({
  server: {
    port: 5175,
    strictPort: false,
  },
  plugins: [
    react(),
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
  server: {
    port: 5175,
    strictPort: false,
  },
});
