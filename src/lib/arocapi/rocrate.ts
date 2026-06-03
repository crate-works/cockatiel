import type { RoCrate, RoCrateEntity } from './types';

// ELAN transcripts are tagged `application/eaf+xml` in the PARADISEC crate (the
// arocapi `/files` mediaType may differ, e.g. `text/x-eaf+xml`, so we never match
// on that — see callers). We accept the encodingFormat or a `.eaf` filename.
const EAF_ENCODING_FORMAT = 'application/eaf+xml';

const typesOf = (entity: RoCrateEntity): string[] => (Array.isArray(entity['@type']) ? entity['@type'] : [entity['@type']]);

// RO-Crate properties point at other entities as `{ '@id': '…' }`, a bare string,
// or an array of either. Normalise any of those to a list of referenced `@id`s.
const refIds = (value: unknown): string[] => {
  const items = Array.isArray(value) ? value : [value];
  const ids: string[] = [];
  for (const item of items) {
    if (typeof item === 'string') {
      ids.push(item);
    } else if (item && typeof item === 'object' && '@id' in item) {
      const id = (item as { '@id': unknown })['@id'];
      if (typeof id === 'string') {
        ids.push(id);
      }
    }
  }
  return ids;
};

const stringProp = (entity: RoCrateEntity, key: string): string | undefined => {
  const value = entity[key];
  return typeof value === 'string' ? value : undefined;
};

// The crate stores both `filename` and `name`; `@id` is usually the file URL whose
// last path segment is the filename. Try all three so matching is robust.
export const entityFilename = (entity: RoCrateEntity): string | undefined => {
  const filename = stringProp(entity, 'filename') ?? stringProp(entity, 'name');
  if (filename) {
    return filename;
  }
  const id = entity['@id'];
  const tail = id.split('/').pop();
  return tail ? decodeURIComponent(tail) : undefined;
};

const indexGraph = (crate: RoCrate): Map<string, RoCrateEntity> => {
  const index = new Map<string, RoCrateEntity>();
  for (const entity of crate['@graph'] ?? []) {
    if (entity && typeof entity['@id'] === 'string') {
      index.set(entity['@id'], entity);
    }
  }
  return index;
};

const isEaf = (entity: RoCrateEntity): boolean =>
  stringProp(entity, 'encodingFormat') === EAF_ENCODING_FORMAT || (entityFilename(entity)?.toLowerCase().endsWith('.eaf') ?? false);

export const findFileEntityByFilename = (crate: RoCrate, filename: string): RoCrateEntity | undefined => {
  const target = filename.toLowerCase();
  return (crate['@graph'] ?? []).find((entity) => typesOf(entity).includes('File') && entityFilename(entity)?.toLowerCase() === target);
};

/**
 * Returns the ELAN (`.eaf`) annotation entities for a media file, discovered from the
 * RO-Crate graph. Follows the media entity's `hasAnnotation` links and, defensively,
 * also picks up any `.eaf` File that declares `annotationOf` the media entity — some
 * crates only encode one side of the relationship.
 */
export const findTranscriptsForFile = (crate: RoCrate, mediaFilename: string): RoCrateEntity[] => {
  const media = findFileEntityByFilename(crate, mediaFilename);
  if (!media) {
    return [];
  }
  const index = indexGraph(crate);
  const found = new Map<string, RoCrateEntity>();

  for (const id of refIds(media.hasAnnotation)) {
    const entity = index.get(id);
    if (entity && isEaf(entity)) {
      found.set(id, entity);
    }
  }

  for (const entity of crate['@graph'] ?? []) {
    if (isEaf(entity) && refIds(entity.annotationOf).includes(media['@id'])) {
      found.set(entity['@id'], entity);
    }
  }

  return [...found.values()];
};
