import { defineConfig } from 'vite';

export default defineConfig({
  base: '/journey-3d/',
  build: {
    rollupOptions: { output: { manualChunks: { three: ['three'] } } },
  },
});
