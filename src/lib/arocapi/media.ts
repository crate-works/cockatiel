import type { File } from './types';

const MEDIA_PREFIXES = ['audio/', 'video/'] as const;

/**
 * Whether a catalog file is playable media (audio or video) as opposed to a
 * sidecar artefact such as a PDF, image, or annotation file. Matches on the
 * server-provided `mediaType` MIME string by prefix so format variants like
 * `audio/x-wav` and `audio/wav` are both accepted.
 */
export const isMediaFile = (file: Pick<File, 'mediaType'>): boolean =>
  MEDIA_PREFIXES.some((prefix) => file.mediaType?.toLowerCase().startsWith(prefix) ?? false);
