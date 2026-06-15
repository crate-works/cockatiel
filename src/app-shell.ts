import { createContext, useContext } from 'react';
import type { ProcessFileOptions } from '@/hooks/useAutoSegment';
import type { CatalogSource } from '@/lib/arocapi';
import type { TranscriptImportOptions } from '@/lib/import/types';

// Shared handles from the persistent root layout (which owns the media-load
// orchestration) down to the leaf routes. A load crosses routes — it's triggered
// on / or /catalog and renders on /session/:fingerprint — so the orchestration
// hooks and the in-memory audioFile must live above the Outlet and be reached
// through this context rather than re-created per route.
export interface AppShell {
  audioFile: File | null;
  processFile: (file: File, options?: ProcessFileOptions) => Promise<void>;
  setAudioFile: (file: File | null) => void;
  handleFileSelected: (file: File, handle?: FileSystemFileHandle) => void;
  handleResegment: () => void;
  loadFromUrl: (rawUrl: string) => Promise<void>;
  loadFromCatalog: (source: CatalogSource, options?: TranscriptImportOptions) => Promise<void>;
}

const AppShellContext = createContext<AppShell | null>(null);

export const AppShellProvider = AppShellContext.Provider;

export const useAppShell = (): AppShell => {
  const ctx = useContext(AppShellContext);
  if (!ctx) {
    throw new Error('useAppShell must be used within the root route layout');
  }
  return ctx;
};
