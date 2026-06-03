import { getAccessToken } from '@/lib/auth/store';
import {
  ArocapiError,
  type EntitiesResponse,
  type Entity,
  type FilesResponse,
  type Provider,
  type RoCrate,
  type SearchRequest,
  type SearchResponse,
} from './types';

const joinUrl = (base: string, path: string): string => `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

const mapResponseError = (response: Response): ArocapiError => {
  if (response.status === 404) {
    return new ArocapiError('not-found', 'Not found (404).', 404);
  }
  if (response.status === 401 || response.status === 403) {
    return new ArocapiError('unauthorised', `Not authorised (${response.status}).`, response.status);
  }
  if (response.status >= 500) {
    return new ArocapiError('server-error', `Server error (${response.status}).`, response.status);
  }
  return new ArocapiError('unknown', `Request failed (${response.status}).`, response.status);
};

const mapNetworkError = (error: unknown, signal: AbortSignal): ArocapiError => {
  if (signal.aborted) {
    return new ArocapiError('aborted', 'Cancelled.');
  }
  const message = error instanceof Error ? error.message : '';
  if (error instanceof TypeError) {
    return new ArocapiError('cors', `Network or CORS error. ${message}`.trim());
  }
  return new ArocapiError('network', message || 'Network error.');
};

const withAuth = (providerId: string, init: RequestInit): RequestInit => {
  const token = getAccessToken(providerId);
  if (!token) {
    return init;
  }
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return { ...init, headers };
};

const requestJson = async <T>(providerId: string, url: string, init: RequestInit, signal: AbortSignal): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(url, { ...withAuth(providerId, init), signal });
  } catch (error) {
    throw mapNetworkError(error, signal);
  }
  if (!response.ok) {
    throw mapResponseError(response);
  }
  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new ArocapiError('unknown', `Failed to parse response: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
};

export interface ClientOptions {
  signal: AbortSignal;
}

export const searchEntities = (provider: Provider, request: SearchRequest, opts: ClientOptions): Promise<SearchResponse> =>
  requestJson<SearchResponse>(
    provider.id,
    joinUrl(provider.baseUrl, '/search'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ searchType: 'basic', ...request }),
    },
    opts.signal,
  );

export const getEntity = (provider: Provider, id: string, opts: ClientOptions): Promise<Entity> =>
  requestJson<Entity>(provider.id, joinUrl(provider.baseUrl, `/entity/${encodeURIComponent(id)}`), { headers: { Accept: 'application/json' } }, opts.signal);

// Fetches the full RO-Crate (`@context` + `@graph`) for an entity via the documented
// Oni endpoint `GET /entity/:id/rocrate`. Unlike `/entity/:id` (a normalised summary),
// this returns the raw ro-crate-metadata.json graph, which is the only place the
// media↔annotation links (`hasAnnotation` / `annotationOf`) are exposed.
export const getEntityCrate = (provider: Provider, id: string, opts: ClientOptions): Promise<RoCrate> =>
  requestJson<RoCrate>(
    provider.id,
    joinUrl(provider.baseUrl, `/entity/${encodeURIComponent(id)}/rocrate`),
    { headers: { Accept: 'application/json' } },
    opts.signal,
  );

export interface ListEntitiesParams {
  memberOf?: string;
  entityType?: string;
  limit?: number;
  offset?: number;
}

export interface ListFilesParams {
  memberOf?: string;
  limit?: number;
  offset?: number;
}

export const listFiles = (provider: Provider, params: ListFilesParams, opts: ClientOptions): Promise<FilesResponse> => {
  const search = new URLSearchParams();
  if (params.memberOf !== undefined) {
    search.set('memberOf', params.memberOf);
  }
  if (params.limit !== undefined) {
    search.set('limit', String(params.limit));
  }
  if (params.offset !== undefined) {
    search.set('offset', String(params.offset));
  }
  const qs = search.toString();
  const url = joinUrl(provider.baseUrl, `/files${qs ? `?${qs}` : ''}`);
  return requestJson<FilesResponse>(provider.id, url, { headers: { Accept: 'application/json' } }, opts.signal);
};

export const listEntities = (provider: Provider, params: ListEntitiesParams, opts: ClientOptions): Promise<EntitiesResponse> => {
  const search = new URLSearchParams();
  if (params.memberOf !== undefined) {
    search.set('memberOf', params.memberOf);
  }
  if (params.entityType !== undefined) {
    search.set('entityType', params.entityType);
  }
  if (params.limit !== undefined) {
    search.set('limit', String(params.limit));
  }
  if (params.offset !== undefined) {
    search.set('offset', String(params.offset));
  }
  const qs = search.toString();
  const url = joinUrl(provider.baseUrl, `/entities${qs ? `?${qs}` : ''}`);
  return requestJson<EntitiesResponse>(provider.id, url, { headers: { Accept: 'application/json' } }, opts.signal);
};

// Resolves a file ID to a downloadable URL. With `noRedirect=true`, arocapi
// responds with JSON `{ location: <url> }` for redirect-backed handlers, which
// lets us hand the URL to the existing audio-fetch pipeline rather than letting
// the browser auto-follow into a CORS-restricted response.
export const resolveFileUrl = async (provider: Provider, fileId: string, opts: ClientOptions): Promise<string> => {
  const url = joinUrl(provider.baseUrl, `/file/${encodeURIComponent(fileId)}?noRedirect=true&disposition=inline`);
  const body = await requestJson<{ location?: string }>(provider.id, url, { headers: { Accept: 'application/json' } }, opts.signal);
  if (!body.location) {
    throw new ArocapiError('unknown', 'arocapi did not return a file location.');
  }
  return body.location;
};

export const formatArocapiError = (error: unknown): string => {
  if (error instanceof ArocapiError) {
    switch (error.kind) {
      case 'invalid-input':
        return error.message;
      case 'not-found':
        return 'Not found in the catalog.';
      case 'unauthorised':
        return 'You are not authorised to access that item.';
      case 'cors':
        return 'Network or CORS error talking to the catalog.';
      case 'server-error':
        return `The catalog returned an error (${error.status ?? '5xx'}).`;
      case 'network':
        return 'Network error talking to the catalog.';
      case 'aborted':
        return 'Request cancelled.';
      default:
        return error.message || 'Catalog request failed.';
    }
  }
  return error instanceof Error ? error.message : 'Catalog request failed.';
};
