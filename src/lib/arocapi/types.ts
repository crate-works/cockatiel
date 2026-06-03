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

interface OidcConfig {
  readonly issuer: string;
  readonly clientId: string;
  readonly scopes: string;
}

export interface Provider {
  readonly id: string;
  readonly label: string;
  readonly baseUrl: string;
  readonly itemUrlTemplate: string;
  readonly oidc?: OidcConfig;
}

interface EntityAccess {
  metadata: boolean;
  content: boolean;
  metadataAuthorizationUrl?: string;
  contentAuthorizationUrl?: string;
}

type SortField = 'id' | 'name' | 'createdAt' | 'updatedAt' | 'relevance';
type SortOrder = 'asc' | 'desc';

export interface SearchRequest {
  query: string;
  filters?: Record<string, string[]>;
  entityType?: string;
  limit?: number;
  offset?: number;
  sort?: SortField;
  order?: SortOrder;
}

interface EntityReference {
  id: string;
  name: string;
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

// Raw RO-Crate JSON-LD as returned by GET /entity/:id/rocrate. We only model the
// minimum we read (`@id`, `@type`); every other property (hasAnnotation,
// annotationOf, encodingFormat, filename, …) is reached through index-signature
// access in the rocrate helpers, because the LDaCA/PARADISEC profile carries far
// more than we consume and we want to stay tolerant of shape variation.
export interface RoCrateEntity {
  '@id': string;
  '@type': string | string[];
  [key: string]: unknown;
}

export interface RoCrate {
  '@context': unknown;
  '@graph': RoCrateEntity[];
}
