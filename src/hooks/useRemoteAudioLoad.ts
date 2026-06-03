import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { type CatalogSource, formatArocapiError, getProvider, resolveFileUrl } from '@/lib/arocapi';
import type { TranscriptImportOptions } from '@/lib/import/types';
import { loadSessionByUrl } from '@/lib/persistence/storage';
import { getSkipDownloadConfirm, setSkipDownloadConfirm } from '@/lib/preferences';
import { fetchRemoteAudio, formatRemoteAudioError, inspectRemoteAudio, type RemoteAudioMeta, validateUrl } from '@/lib/remote-audio';
import { useAppStore } from '@/lib/store';
import { isAbortError, pluralizeSegment } from '@/lib/utils';
import type { ProcessFileOptions } from './useAutoSegment';

interface UseRemoteAudioLoadArgs {
  processFile: (file: File, options?: ProcessFileOptions) => Promise<void>;
  setAudioFile: (file: File | null) => void;
}

interface PendingConfirmationView {
  filename: string;
  host: string;
  size?: number;
}

export interface UseRemoteAudioLoadResult {
  cancel: () => void;
  loadFromUrl: (rawUrl: string) => Promise<void>;
  loadFromCatalog: (source: CatalogSource, options?: TranscriptImportOptions) => Promise<void>;
  pendingConfirmation: PendingConfirmationView | null;
  resolveConfirmation: (proceed: boolean, dontAskAgain: boolean) => void;
}

export const useRemoteAudioLoad = ({ processFile, setAudioFile }: UseRemoteAudioLoadArgs): UseRemoteAudioLoadResult => {
  const downloadAbortRef = useRef<AbortController | null>(null);
  const confirmationResolverRef = useRef<((proceed: boolean) => void) | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmationView | null>(null);

  const cancel = useCallback(() => {
    downloadAbortRef.current?.abort();
  }, []);

  const requestConfirmation = useCallback((meta: RemoteAudioMeta, host: string): Promise<boolean> => {
    return new Promise((resolve) => {
      confirmationResolverRef.current = resolve;
      setPendingConfirmation({ filename: meta.filename, host, size: meta.size });
    });
  }, []);

  const resolveConfirmation = useCallback((proceed: boolean, dontAskAgain: boolean) => {
    const resolver = confirmationResolverRef.current;
    confirmationResolverRef.current = null;
    setPendingConfirmation(null);
    if (proceed && dontAskAgain) {
      setSkipDownloadConfirm(true);
    }
    resolver?.(proceed);
  }, []);

  const loadFromUrl = useCallback(
    async (rawUrl: string) => {
      const trimmed = rawUrl.trim();
      if (!trimmed) {
        return;
      }

      let url: URL;
      try {
        url = validateUrl(trimmed);
      } catch (error) {
        toast.error(formatRemoteAudioError(error));
        return;
      }

      const href = url.toString();
      const cached = await loadSessionByUrl(href);
      if (cached) {
        const store = useAppStore.getState();
        // Clear audio from any previous session so Waveform shows its 'Loading audio…' overlay
        // until backgroundFetch lands the bytes for this session.
        setAudioFile(null);
        store.hydrateFromStoredSession(cached);
        store.setAppPhase('ready');
        store.setStatus('');
        store.setProgress(0);
        toast.success(`Restored saved session for "${cached.mediaFileName}" — ${pluralizeSegment(cached.segments.length)}.`);
        void runBackgroundFetch(url, cached.mediaFileName, setAudioFile, downloadAbortRef);
        return;
      }

      downloadAbortRef.current?.abort();
      const controller = new AbortController();
      downloadAbortRef.current = controller;
      const { signal } = controller;

      const store = useAppStore.getState();
      const handleFailure = (error: unknown) => {
        store.setAppPhase('upload');
        store.setStatus('');
        if (isAbortError(error)) {
          return;
        }
        toast.error(formatRemoteAudioError(error));
      };

      store.setAppPhase('processing');
      store.setStatus('Inspecting URL...');
      store.setProgress(0);

      let meta: RemoteAudioMeta;
      try {
        meta = await inspectRemoteAudio(url, signal);
      } catch (error) {
        handleFailure(error);
        return;
      }

      if (!getSkipDownloadConfirm()) {
        const proceed = await requestConfirmation(meta, url.host);
        if (!proceed) {
          store.setAppPhase('upload');
          store.setStatus('');
          return;
        }
      }

      store.setStatus('Downloading audio...');
      let file: File;
      try {
        file = await fetchRemoteAudio(url, {
          filename: meta.filename,
          onProgress: (progress) => {
            if (typeof progress.fraction === 'number') {
              store.setProgress(progress.fraction);
            }
          },
          signal,
        });
      } catch (error) {
        handleFailure(error);
        return;
      }

      await processFile(file, { sourceUrl: href });
    },
    [processFile, requestConfirmation, setAudioFile],
  );

  const loadFromCatalog = useCallback(
    async (source: CatalogSource, options?: TranscriptImportOptions) => {
      const provider = getProvider(source.providerId);
      if (!provider) {
        toast.error(`Unknown catalog provider: ${source.providerId}`);
        return;
      }

      downloadAbortRef.current?.abort();
      const controller = new AbortController();
      downloadAbortRef.current = controller;
      const { signal } = controller;

      const store = useAppStore.getState();
      const handleFailure = (error: unknown) => {
        store.setAppPhase('upload');
        store.setStatus('');
        if (isAbortError(error)) {
          return;
        }
        toast.error(formatArocapiError(error));
      };

      store.setAppPhase('processing');
      store.setStatus('Resolving file from catalog...');
      store.setProgress(0);

      // Step 1: resolve the signed media URL from arocapi.
      let resolved: string;
      try {
        resolved = await resolveFileUrl(provider, source.fileId, { signal });
      } catch (error) {
        handleFailure(error);
        return;
      }

      // Step 2: reuse the existing remote-audio pipeline (inspect → fetch → process)
      // but skip the ConfirmDownloadDialog — the drawer is the confirmation.
      let url: URL;
      try {
        url = validateUrl(resolved);
      } catch (error) {
        store.setAppPhase('upload');
        store.setStatus('');
        toast.error(formatRemoteAudioError(error));
        return;
      }

      store.setStatus('Inspecting file...');
      let meta: RemoteAudioMeta;
      try {
        meta = await inspectRemoteAudio(url, signal);
      } catch (error) {
        store.setAppPhase('upload');
        store.setStatus('');
        if (!isAbortError(error)) {
          toast.error(formatRemoteAudioError(error));
        }
        return;
      }

      store.setStatus('Downloading audio...');
      let file: File;
      try {
        file = await fetchRemoteAudio(url, {
          filename: meta.filename,
          onProgress: (progress) => {
            if (typeof progress.fraction === 'number') {
              store.setProgress(progress.fraction);
            }
          },
          signal,
        });
      } catch (error) {
        store.setAppPhase('upload');
        store.setStatus('');
        if (!isAbortError(error)) {
          toast.error(formatRemoteAudioError(error));
        }
        return;
      }

      // Deliberately don't pass sourceUrl: the resolved URL is a short-lived signed
      // S3 link that would be useless on session re-open. catalogSource carries
      // everything needed to re-resolve a fresh URL on demand.
      await processFile(file, { catalogSource: source, ...options });
    },
    [processFile],
  );

  return { cancel, loadFromCatalog, loadFromUrl, pendingConfirmation, resolveConfirmation };
};

const runBackgroundFetch = async (
  url: URL,
  expectedFilename: string,
  setAudioFile: (file: File | null) => void,
  abortRef: React.RefObject<AbortController | null>,
) => {
  abortRef.current?.abort();
  const controller = new AbortController();
  abortRef.current = controller;
  try {
    const file = await fetchRemoteAudio(url, {
      filename: expectedFilename,
      signal: controller.signal,
    });
    setAudioFile(file);
  } catch (error) {
    if (isAbortError(error)) {
      return;
    }
    console.error('Background refetch failed:', error);
    toast.error(`Could not load audio from URL: ${formatRemoteAudioError(error)}`);
  }
};
