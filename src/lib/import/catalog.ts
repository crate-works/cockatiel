import { ArocapiError, listFiles, type Provider, resolveFileUrl } from '../arocapi';
import { parseEaf } from './eaf';
import type { ParsedTranscript } from './types';

// Downloads and parses a catalog transcript file. The RO-Crate entity gives us the
// transcript's filename, which we match against the item's arocapi `/files` listing to
// obtain the file id (the crate `@id` is not guaranteed to equal the arocapi id), then
// resolve to a signed URL and fetch the bytes — the same path used for media files.
export const fetchCatalogTranscript = async (
  provider: Provider,
  itemEntityId: string,
  transcriptFilename: string,
  signal: AbortSignal,
): Promise<ParsedTranscript> => {
  const { files } = await listFiles(provider, { memberOf: itemEntityId, limit: 1000 }, { signal });
  const target = transcriptFilename.toLowerCase();
  const match = files.find((file) => file.filename.toLowerCase() === target);
  if (!match) {
    throw new ArocapiError('not-found', `Transcript "${transcriptFilename}" was not found in the catalog file listing.`);
  }
  if (match.access?.content === false) {
    throw new ArocapiError('unauthorised', `The transcript "${transcriptFilename}" is access-restricted.`);
  }

  const url = await resolveFileUrl(provider, match.id, { signal });
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (signal.aborted) {
      throw new ArocapiError('aborted', 'Cancelled.');
    }
    throw new ArocapiError('network', error instanceof Error ? error.message : 'Could not download the transcript.');
  }
  if (!response.ok) {
    throw new ArocapiError('unknown', `Could not download the transcript (${response.status}).`);
  }

  return parseEaf(await response.text());
};
