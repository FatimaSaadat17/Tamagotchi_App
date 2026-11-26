import { defineConfig } from 'vite';

export default defineConfig({
  root: 'frontend',
  base: './',
  esbuild: { jsx: 'automatic' },
  server: {
    proxy: {
      '/api/day-plans': 'http://127.0.0.1:8080',
      '/api/chat': 'http://127.0.0.1:8080',
    },
  },
});
