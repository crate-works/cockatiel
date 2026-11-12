import 'fake-indexeddb/auto';
import { act, renderHook, waitFor } from '@testing-library/react';
import { clear, createStore } from 'idb-keyval';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRemoteAudioLoad } from '@/hooks/useRemoteAudioLoad';
import { upsertSession } from '@/lib/persistence/storage';
import { useAppStore } from '@/lib/store';
import { makePayload } from '../lib/persistence/test-util';

const SOURCE_URL = 'https://example.org/session.wav';

const controllableResponse = (headers: Record<string, string> = {}) => {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start: (c) => {
      controller = c;
    },
  });
  return { controller, response: new Response(body, { headers, status: 200 }) };
};

const hangUntilAborted = (_url: URL | RequestInfo, init?: RequestInit) =>
  new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
  });

const mountHook = () => {
  const setAudioFile = vi.fn();
  const { result } = renderHook(() => useRemoteAudioLoad({ onReady: vi.fn(), processFile: vi.fn(), setAudioFile }));
  return { result, setAudioFile };
};

describe('useRemoteAudioLoad background download of a saved URL session', () => {
  beforeEach(async () => {
    await clear(createStore('cockatiel', 'sessions'));
    await upsertSession(makePayload({ sourceUrl: SOURCE_URL }));
    useAppStore.getState().reset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    useAppStore.getState().reset();
  });

  it('reports progress while downloading, then goes idle when the file arrives', async () => {
    const { controller, response } = controllableResponse({ 'Content-Length': '10' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    const { result, setAudioFile } = mountHook();

    await act(() => result.current.loadFromUrl(SOURCE_URL));
    await waitFor(() => expect(useAppStore.getState().mediaDownload).toEqual({ kind: 'downloading' }));

    act(() => controller.enqueue(new Uint8Array(4)));
    await waitFor(() => expect(useAppStore.getState().mediaDownload).toEqual({ fraction: 0.4, kind: 'downloading' }));

    act(() => controller.close());
    await waitFor(() => expect(setAudioFile).toHaveBeenLastCalledWith(expect.any(File)));
    expect(useAppStore.getState().mediaDownload).toEqual({ kind: 'idle' });
  });

  it('marks the download failed when the server errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
    const { result } = mountHook();

    await act(() => result.current.loadFromUrl(SOURCE_URL));

    await waitFor(() => expect(useAppStore.getState().mediaDownload).toEqual({ kind: 'failed' }));
  });

  it('marks the download failed when cancelled with nothing to replace it', async () => {
    vi.stubGlobal('fetch', vi.fn(hangUntilAborted));
    const { result } = mountHook();
    await act(() => result.current.loadFromUrl(SOURCE_URL));

    act(() => result.current.cancel());

    await waitFor(() => expect(useAppStore.getState().mediaDownload).toEqual({ kind: 'failed' }));
  });

  it('leaves the download state to the newer download when one replaces it', async () => {
    const { controller, response } = controllableResponse({ 'Content-Length': '10' });
    vi.stubGlobal('fetch', vi.fn(hangUntilAborted).mockImplementationOnce(hangUntilAborted).mockResolvedValueOnce(response));
    const { result } = mountHook();
    await act(() => result.current.loadFromUrl(SOURCE_URL));

    await act(() => result.current.loadFromUrl(SOURCE_URL));
    await new Promise((r) => setTimeout(r, 0));
    expect(useAppStore.getState().mediaDownload).toEqual({ kind: 'downloading' });

    act(() => controller.enqueue(new Uint8Array(5)));
    await waitFor(() => expect(useAppStore.getState().mediaDownload).toEqual({ fraction: 0.5, kind: 'downloading' }));
  });
});

describe('useRemoteAudioLoad catalog reload failure', () => {
  afterEach(() => {
    useAppStore.getState().reset();
  });

  it('marks the download failed when the catalog provider is unknown', async () => {
    const { result } = mountHook();

    await act(() => result.current.loadFromCatalog({ baseUrl: 'https://example.org', fileId: 'f1', itemEntityId: 'i1', providerId: 'missing' }));

    expect(useAppStore.getState().mediaDownload).toEqual({ kind: 'failed' });
  });
});
