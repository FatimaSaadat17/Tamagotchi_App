import { defineConfig } from 'vite';

export default defineConfig({
  root: 'frontend',
  base: './',
  esbuild: { jsx: 'automatic' },
});
