import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { ImportChoice } from '@/components/catalog/ImportTranscriptDialog';
import {
  type File as CatalogFile,
  type CatalogSource,
  entityFilename,
  findTranscriptsForFile,
  formatArocapiError,
  getEntityCrate,
  getProvider,
  type Provider,
} from '@/lib/arocapi';
import { fetchCatalogTranscript } from '@/lib/import/catalog';
import type { ParsedTranscript, TranscriptImportOptions } from '@/lib/import/types';
import { loadSessionByCatalogFile } from '@/lib/persistence/storage';
import { useAppStore } from '@/lib/store';
import { isAbortError } from '@/lib/utils';

interface UseTranscriptImportArgs {
  onLoadCatalog: (source: CatalogSource, options?: TranscriptImportOptions) => Promise<void>;
}

interface ImportDialogState {
  mediaFilename: string;
  transcriptFilename: string;
  hasExisting: boolean;
}

interface PendingImport {
  provider: Provider;
  source: CatalogSource;
  transcriptFilename: string;
}

export interface UseTranscriptImportResult {
  dialog: ImportDialogState | null;
  requestLoad: (file: CatalogFile) => Promise<void>;
  resolveDialog: (choice: ImportChoice) => void;
}

// Orchestrates loading a catalog media file with the optional "bring the existing
// transcript across" step: discover an .eaf in the item's RO-Crate, prompt the user,
// then either import it or fall through to the normal (VAD) load.
export const useTranscriptImport = ({ onLoadCatalog }: UseTranscriptImportArgs): UseTranscriptImportResult => {
  const [dialog, setDialog] = useState<ImportDialogState | null>(null);
  const pendingRef = useRef<PendingImport | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const requestLoad = useCallback(
    async (file: CatalogFile) => {
      const store = useAppStore.getState();
      const { providerId, selectedEntityId } = store.catalogSearch;
      const provider = getProvider(providerId);
      if (!provider || !selectedEntityId) {
        return;
      }
      const source: CatalogSource = { providerId, baseUrl: provider.baseUrl, itemEntityId: selectedEntityId, fileId: file.id };

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Discover whether this media file has a linked transcript in the crate. A failure
      // here (crate missing/unreachable) is not fatal — we just fall back to a normal load.
      try {
        const crate = await getEntityCrate(provider, selectedEntityId, { signal: controller.signal });
        const transcripts = findTranscriptsForFile(crate, file.filename);
        if (transcripts.length === 0) {
          store.closeCatalogDrawer();
          void onLoadCatalog(source);
          return;
        }
        const transcriptFilename = entityFilename(transcripts[0]) ?? 'transcript.eaf';
        const existing = await loadSessionByCatalogFile(providerId, file.id);
        pendingRef.current = { provider, source, transcriptFilename };
        setDialog({ hasExisting: existing !== undefined, mediaFilename: file.filename, transcriptFilename });
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        console.warn('Could not check the catalog for an existing transcript:', error);
        store.closeCatalogDrawer();
        void onLoadCatalog(source);
      }
    },
    [onLoadCatalog],
  );

  const resolveDialog = useCallback(
    (choice: ImportChoice) => {
      const pending = pendingRef.current;
      pendingRef.current = null;
      setDialog(null);
      if (!pending || choice === 'cancel') {
        return;
      }

      const store = useAppStore.getState();
      store.closeCatalogDrawer();

      // "Reopen saved session" / "Auto-segment": load without importing. processFile
      // restores an existing session or runs VAD as appropriate.
      if (choice === 'plain') {
        void onLoadCatalog(pending.source);
        return;
      }

      void (async () => {
        const controller = new AbortController();
        abortRef.current = controller;
        store.setAppPhase('processing');
        store.setStatus('Loading transcript...');
        store.setProgress(0);

        let parsed: ParsedTranscript;
        try {
          parsed = await fetchCatalogTranscript(pending.provider, pending.source.itemEntityId, pending.transcriptFilename, controller.signal);
        } catch (error) {
          if (isAbortError(error)) {
            return;
          }
          toast.error(`Couldn't import the transcript: ${formatArocapiError(error)} Segmenting the audio instead.`);
          void onLoadCatalog(pending.source);
          return;
        }

        if (parsed.segments.length === 0) {
          toast.info('That transcript had no time-aligned annotations; segmenting the audio instead.');
          void onLoadCatalog(pending.source);
          return;
        }

        void onLoadCatalog(pending.source, { importedAnnotations: parsed, replaceExisting: choice === 'replace' });
      })();
    },
    [onLoadCatalog],
  );

  return { dialog, requestLoad, resolveDialog };
};
