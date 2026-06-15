import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const crossOriginIsolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
};

export default defineConfig({
  // `/` for dev and the self-host docker image; `/app/` for the official
  // GitHub Pages build (set in the deploy workflow). See Dockerfile / deploy.yml.
  // Catalog providers are loaded at runtime from public/config.json (served at
  // `${BASE_URL}config.json`); the docker image overwrites it with an empty list.
  base: process.env.VITE_BASE_PATH || '/',
  // tanstackRouter must precede the React plugin so the generated route tree is
  // transformed by it. autoCodeSplitting keeps route components out of the main
  // bundle.
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    headers: crossOriginIsolationHeaders,
  },
  preview: {
    headers: crossOriginIsolationHeaders,
  },
});
