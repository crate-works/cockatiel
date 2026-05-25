import { QueryClient } from '@tanstack/react-query';

export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Catalog data changes slowly; don't punish navigation with re-fetches.
        staleTime: 30_000,
        // User-driven searches; aggressive retry feels broken when the user is mid-typing.
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
