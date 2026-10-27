import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During development, /api requests are proxied to the Spring Boot backend so the browser
// talks to a single origin. Set VITE_API_BASE_URL to call a different backend directly.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
        },
      },
    },
  },
  test: {
    environment: 'node',
  },
});
