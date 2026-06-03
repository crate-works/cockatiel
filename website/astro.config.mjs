// @ts-check
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// The marketing/docs site is served at the root of cockatiel.crate-works.org;
// the app itself is assembled under /app/ by scripts/build-deploy.sh.
export default defineConfig({
  site: 'https://cockatiel.crate-works.org',
  output: 'static',
  integrations: [mdx()],
  vite: {
    plugins: [tailwindcss()],
  },
});
