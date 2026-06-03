import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatArocapiError, getEntity, listEntities, resolveFileUrl, searchEntities } from '@/lib/arocapi/client';
import type { Provider } from '@/lib/arocapi/types';
import { ArocapiError } from '@/lib/arocapi/types';

// Providers are loaded from runtime config in the app; tests construct one directly.
const paradisec: Provider = {
  id: 'paradisec',
  label: 'PARADISEC',
  baseUrl: 'https://admin-catalog.paradisec.org.au/api/v1/oni',
  itemUrlTemplate: 'https://catalog.paradisec.org.au/items/{itemId}',
};

const okJson = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const errResponse = (status: number): Response => new Response('', { status });

const controller = (): AbortController => new AbortController();

describe('searchEntities', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });
  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('POSTs to /search with the default searchType and request body', async () => {
    fetchSpy.mockResolvedValue(okJson({ total: 0, searchTime: 1, entities: [] }));
    await searchEntities(paradisec, { query: 'pintupi', limit: 50 }, { signal: controller().signal });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${paradisec.baseUrl}/search`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ searchType: 'basic', query: 'pintupi', limit: 50 });
  });

  it('maps 500 to a server-error ArocapiError', async () => {
    fetchSpy.mockResolvedValue(errResponse(503));
    await expect(searchEntities(paradisec, { query: 'x' }, { signal: controller().signal })).rejects.toMatchObject({
      kind: 'server-error',
      status: 503,
    });
  });

  it('maps network failures to network ArocapiError', async () => {
    fetchSpy.mockRejectedValue(new Error('boom'));
    await expect(searchEntities(paradisec, { query: 'x' }, { signal: controller().signal })).rejects.toMatchObject({
      kind: 'network',
    });
  });

  it('maps TypeError to cors ArocapiError', async () => {
    fetchSpy.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(searchEntities(paradisec, { query: 'x' }, { signal: controller().signal })).rejects.toMatchObject({
      kind: 'cors',
    });
  });

  it('reports aborted requests as aborted', async () => {
    const ctrl = controller();
    fetchSpy.mockImplementation(() => {
      ctrl.abort();
      return Promise.reject(new DOMException('aborted', 'AbortError'));
    });
    await expect(searchEntities(paradisec, { query: 'x' }, { signal: ctrl.signal })).rejects.toMatchObject({
      kind: 'aborted',
    });
  });
});

describe('getEntity', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });
  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('URL-encodes the entity ID (which may contain slashes)', async () => {
    fetchSpy.mockResolvedValue(okJson({ id: 'arcp://x/y' }));
    await getEntity(paradisec, 'arcp://name,corpus/item/KM1-001', { signal: controller().signal });
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toBe(`${paradisec.baseUrl}/entity/${encodeURIComponent('arcp://name,corpus/item/KM1-001')}`);
  });

  it('maps 404 to not-found', async () => {
    fetchSpy.mockResolvedValue(errResponse(404));
    await expect(getEntity(paradisec, 'missing', { signal: controller().signal })).rejects.toMatchObject({
      kind: 'not-found',
    });
  });
});

describe('listEntities', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });
  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('builds a query string from supplied params', async () => {
    fetchSpy.mockResolvedValue(okJson({ total: 0, entities: [] }));
    await listEntities(
      paradisec,
      { memberOf: 'arcp://x/y', entityType: 'http://schema.org/MediaObject', limit: 25, offset: 50 },
      { signal: controller().signal },
    );
    const [url] = fetchSpy.mock.calls[0] as [string];
    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/api/v1/oni/entities');
    expect(parsed.searchParams.get('memberOf')).toBe('arcp://x/y');
    expect(parsed.searchParams.get('entityType')).toBe('http://schema.org/MediaObject');
    expect(parsed.searchParams.get('limit')).toBe('25');
    expect(parsed.searchParams.get('offset')).toBe('50');
  });

  it('omits unset params', async () => {
    fetchSpy.mockResolvedValue(okJson({ total: 0, entities: [] }));
    await listEntities(paradisec, {}, { signal: controller().signal });
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toBe(`${paradisec.baseUrl}/entities`);
  });
});

describe('resolveFileUrl', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });
  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns the location field with noRedirect=true', async () => {
    fetchSpy.mockResolvedValue(okJson({ location: 'https://signed.example/audio.mp3?sig=abc' }));
    const url = await resolveFileUrl(paradisec, 'f1', { signal: controller().signal });
    expect(url).toBe('https://signed.example/audio.mp3?sig=abc');
    const [requested] = fetchSpy.mock.calls[0] as [string];
    const parsed = new URL(requested);
    expect(parsed.searchParams.get('noRedirect')).toBe('true');
    expect(parsed.searchParams.get('disposition')).toBe('inline');
  });

  it('throws when arocapi omits a location', async () => {
    fetchSpy.mockResolvedValue(okJson({}));
    await expect(resolveFileUrl(paradisec, 'f1', { signal: controller().signal })).rejects.toBeInstanceOf(ArocapiError);
  });
});

describe('formatArocapiError', () => {
  it('produces friendly text for each kind', () => {
    expect(formatArocapiError(new ArocapiError('not-found', 'x'))).toMatch(/not found/i);
    expect(formatArocapiError(new ArocapiError('unauthorised', 'x'))).toMatch(/authorised/i);
    expect(formatArocapiError(new ArocapiError('cors', 'x'))).toMatch(/cors/i);
    expect(formatArocapiError(new ArocapiError('server-error', 'x', 502))).toMatch(/502/);
    expect(formatArocapiError(new ArocapiError('network', 'x'))).toMatch(/network/i);
    expect(formatArocapiError(new ArocapiError('aborted', 'x'))).toMatch(/cancel/i);
  });

  it('passes through plain Error messages', () => {
    expect(formatArocapiError(new Error('whoops'))).toBe('whoops');
  });

  it('falls back for non-Error values', () => {
    expect(formatArocapiError('weird')).toBe('Catalog request failed.');
  });
});
