import type { Annotation } from '../segment-ops';

// The result of importing an external annotation file (e.g. an ELAN `.eaf`) into
// Cockatiel's flat model: ready-to-use segments plus the speaker names they index.
export interface ParsedTranscript {
  segments: Annotation[];
  speakerNames: string[];
}

// Threaded through the catalog-load layers (useTranscriptImport → loadFromCatalog →
// processFile) when the user opts to bring an existing transcript across.
export interface TranscriptImportOptions {
  // When set, the file's transcript is taken from these pre-parsed annotations
  // instead of running VAD segmentation.
  importedAnnotations?: ParsedTranscript;
  // Overwrite an existing saved session for the same recording (the user explicitly
  // chose "Replace" at the import prompt).
  replaceExisting?: boolean;
}
