export type ArocapiErrorKind = 'invalid-input' | 'not-found' | 'unauthorised' | 'cors' | 'server-error' | 'network' | 'aborted' | 'unknown';

export class ArocapiError extends Error {
  readonly kind: ArocapiErrorKind;
  readonly status?: number;

  constructor(kind: ArocapiErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'ArocapiError';
    this.kind = kind;
    this.status = status;
  }
}

export interface Provider {
  readonly id: string;
  readonly label: string;
  readonly baseUrl: string;
  readonly itemUrlTemplate: string;
}

type SortField = 'id' | 'name' | 'createdAt' | 'updatedAt' | 'relevance';
type SortOrder = 'asc' | 'desc';

export interface SearchRequest {
  query: string;
  filters?: Record<string, string[]>;
  limit?: number;
  offset?: number;
  sort?: SortField;
  order?: SortOrder;
}

interface EntityReference {
  id: string;
  name: string;
}

interface EntityAccess {
  metadata: boolean;
  content: boolean;
  metadataAuthorizationUrl?: string;
  contentAuthorizationUrl?: string;
}

export interface Entity {
  id: string;
  entityType: string;
  name: string;
  description: string;
  memberOf: EntityReference | null;
  rootCollection: EntityReference | null;
  metadataLicenseId: string;
  contentLicenseId: string;
  access: EntityAccess;
}

interface SearchHighlight {
  name?: string[];
  description?: string[];
}

export interface SearchEntity extends Entity {
  searchExtra?: {
    score: number;
    highlight?: SearchHighlight;
  };
}

interface FacetBucket {
  name: string;
  count: number;
}

export type Facets = Record<string, FacetBucket[]>;

export interface SearchResponse {
  total: number;
  searchTime: number;
  entities: SearchEntity[];
  facets?: Facets;
}

export interface EntitiesResponse {
  total: number;
  entities: Entity[];
}

// File metadata returned by GET /files. The connection back to the parent
// Item is via `memberOf`. `access` is only present on the AuthorisedFile
// variant — public records typically include it.
export interface File {
  id: string;
  filename: string;
  mediaType: string;
  size: number;
  memberOf?: { id: string; name: string } | string | null;
  access?: { content: boolean; contentAuthorizationUrl?: string };
}

export interface FilesResponse {
  total: number;
  files: File[];
}

export interface CatalogSource {
  providerId: string;
  baseUrl: string;
  itemEntityId: string;
  fileId: string;
}
