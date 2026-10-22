import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import csp from 'vite-plugin-csp-guard';

const crossOriginIsolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
};

// A <meta> rather than a header because GitHub Pages can't set headers.
// connect-src allows any https: because providers come from runtime config.json
// and users can load media by URL. style-src needs 'unsafe-inline' for sonner's
// injected <style>.
const contentSecurityPolicy = csp({
  override: true,
  policy: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'wasm-unsafe-eval'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:'],
    'font-src': ["'self'", 'data:'],
    'media-src': ["'self'", 'blob:'],
    'connect-src': ["'self'", 'https:'],
    'worker-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  },
});

export default defineConfig({
  // `/` for dev and the self-host docker image; `/app/` for the official
  // GitHub Pages build (set in the deploy workflow). See Dockerfile / deploy.yml.
  // Catalog providers are loaded at runtime from public/config.json (served at
  // `${BASE_URL}config.json`); the docker image overwrites it with an empty list.
  base: process.env.VITE_BASE_PATH || '/',
  // tanstackRouter must precede the React plugin so the generated route tree is
  // transformed by it. autoCodeSplitting keeps route components out of the main
  // bundle.
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss(), contentSecurityPolicy],
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
