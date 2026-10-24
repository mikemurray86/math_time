import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'src/client',
  plugins: [react()],
  build: { outDir: '../../dist', emptyOutDir: true },
  server: {
    host: true,
    // Trailing slash matters: a bare '/api' prefix also swallows the client's own /api.ts module.
    proxy: { '/api/': 'http://localhost:8080' },
  },
  test: { root: '.', include: ['tests/**/*.test.ts'] },
});
