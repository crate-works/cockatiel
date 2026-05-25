import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { getEntity, listFiles, searchEntities } from './client';
import { getProvider } from './providers';
import { arocapiKeys } from './query-keys';
import type { CatalogSource, Entity, FilesResponse, SearchRequest, SearchResponse } from './types';

const requireProvider = (providerId: string) => {
  const provider = getProvider(providerId);
  if (!provider) {
    throw new Error(`Unknown arocapi provider: ${providerId}`);
  }
  return provider;
};

export const useSearchEntities = (providerId: string, request: SearchRequest, opts?: { enabled?: boolean }): UseQueryResult<SearchResponse> =>
  useQuery({
    queryKey: arocapiKeys.search(providerId, request),
    queryFn: ({ signal }) => searchEntities(requireProvider(providerId), request, { signal }),
    enabled: opts?.enabled ?? true,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });

export const useEntity = (providerId: string, id: string | null, opts?: { enabled?: boolean }): UseQueryResult<Entity> =>
  useQuery({
    queryKey: arocapiKeys.entity(providerId, id ?? ''),
    queryFn: ({ signal }) => getEntity(requireProvider(providerId), id as string, { signal }),
    enabled: (opts?.enabled ?? true) && id !== null && id !== '',
    staleTime: 60_000,
  });

// Files attached to a parent Item, fetched via the dedicated /files endpoint
// (returns filename, mediaType, size — much richer than entity-based listing).
export const useFiles = (providerId: string, itemEntityId: string | null, opts?: { enabled?: boolean }): UseQueryResult<FilesResponse> =>
  useQuery({
    queryKey: arocapiKeys.files(providerId, { memberOf: itemEntityId ?? '', limit: 100 }),
    queryFn: ({ signal }) => listFiles(requireProvider(providerId), { memberOf: itemEntityId as string, limit: 100 }, { signal }),
    enabled: (opts?.enabled ?? true) && itemEntityId !== null && itemEntityId !== '',
    staleTime: 60_000,
  });

// On session reload we want to re-resolve the human-readable metadata for the badge
// in <Header>. The hook degrades gracefully: callers should fall back to displaying
// `source.itemEntityId` when this returns an error (e.g. catalog unreachable).
export const useCatalogEntity = (source: CatalogSource | undefined): UseQueryResult<Entity> =>
  useQuery({
    queryKey: source ? arocapiKeys.catalogEntity(source) : ['arocapi', 'noop'],
    queryFn: ({ signal }) => getEntity(requireProvider((source as CatalogSource).providerId), (source as CatalogSource).itemEntityId, { signal }),
    enabled: source !== undefined,
    staleTime: 5 * 60_000,
    retry: 1,
  });
