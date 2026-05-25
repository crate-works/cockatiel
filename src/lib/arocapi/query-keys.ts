import type { ListEntitiesParams, ListFilesParams } from './client';
import type { CatalogSource, SearchRequest } from './types';

// Provider id is always the second segment so switching catalogs invalidates the whole subtree.
export const arocapiKeys = {
  all: ['arocapi'] as const,
  provider: (providerId: string) => ['arocapi', providerId] as const,
  search: (providerId: string, params: SearchRequest) => ['arocapi', providerId, 'search', params] as const,
  entity: (providerId: string, id: string) => ['arocapi', providerId, 'entity', id] as const,
  entities: (providerId: string, params: ListEntitiesParams) => ['arocapi', providerId, 'entities', params] as const,
  files: (providerId: string, params: ListFilesParams) => ['arocapi', providerId, 'files', params] as const,
  fileMetadata: (providerId: string, fileId: string) => ['arocapi', providerId, 'file', fileId, 'meta'] as const,
  catalogEntity: (source: CatalogSource) => ['arocapi', source.providerId, 'entity', source.itemEntityId] as const,
};
