import { defineConfig } from 'vite';

// For GitHub Pages under https://<user>.github.io/bonepile/
// base './' keeps the build portable when served from a subfolder.
export default defineConfig({
  base: './',
  server: {
    port: 5173,
    strictPort: false
  },
  build: {
    chunkSizeWarningLimit: 900
  }
});
