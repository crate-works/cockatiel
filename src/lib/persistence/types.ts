import type { CatalogSource } from '@/lib/arocapi';
import type { ExportData } from '@/lib/export/types';
import type { VadConfig } from '@/lib/vad';

export const SCHEMA_VERSION = 1 as const;

export interface StoredSession extends ExportData {
  catalogSource?: CatalogSource;
  createdAt: number;
  fileHandle?: FileSystemFileHandle;
  fingerprint: string;
  schemaVersion: typeof SCHEMA_VERSION;
  sourceUrl?: string;
  updatedAt: number;
  vadConfig: VadConfig;
}

export interface SessionSummary {
  catalogSource?: CatalogSource;
  fingerprint: string;
  mediaDuration: number;
  mediaFileName: string;
  segmentCount: number;
  sourceUrl?: string;
  speakerCount: number;
  title: string;
  transcribedSegmentCount: number;
  updatedAt: number;
  wordCount: number;
}
