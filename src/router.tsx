import { createRouter } from '@tanstack/react-router';
import { parseSearch, stringifySearch } from '@/lib/router-search';
import { routeTree } from './routeTree.gen';

// `basepath` honours Vite's BASE_URL ('/' for dev/docker, '/app/' for GitHub
// Pages) so every Link/navigate is sub-path aware in one place — replacing the
// hand-rolled BASE_URL juggling that used to live in lib/auth. trailingSlash is
// 'never': the deploy serves 404.html for unknown paths (no materialised
// directories), so GitHub Pages never 301-redirects to add a slash.
export const router = createRouter({
  routeTree,
  basepath: import.meta.env.BASE_URL,
  trailingSlash: 'never',
  parseSearch,
  stringifySearch,
  defaultPreload: 'intent',
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
