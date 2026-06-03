import { describe, expect, it } from 'vitest';
import { entityFilename, findFileEntityByFilename, findTranscriptsForFile } from '@/lib/arocapi/rocrate';
import type { RoCrate } from '@/lib/arocapi/types';
import crateJson from '../../fixtures/crate.json?raw';

const crate = JSON.parse(crateJson) as RoCrate;

describe('rocrate helpers', () => {
  describe('findFileEntityByFilename', () => {
    it('finds a File entity by filename', () => {
      const entity = findFileEntityByFilename(crate, 'XX1-0001-A.mp3');
      expect(entity?.['@id']).toBe('https://example.org/repository/XX1/0001/XX1-0001-A.mp3');
    });

    it('does not match the item or non-File entities', () => {
      expect(findFileEntityByFilename(crate, 'Example item')).toBeUndefined();
    });

    it('returns undefined for an unknown filename', () => {
      expect(findFileEntityByFilename(crate, 'nope.mp3')).toBeUndefined();
    });
  });

  describe('findTranscriptsForFile', () => {
    it('returns the linked .eaf for a media file with hasAnnotation', () => {
      const transcripts = findTranscriptsForFile(crate, 'XX1-0001-A.mp3');
      expect(transcripts.map((t) => entityFilename(t))).toEqual(['XX1-0001-A.eaf']);
    });

    it('resolves the link from the wav side too (different filename, same .eaf)', () => {
      const transcripts = findTranscriptsForFile(crate, 'XX1-0001-A.wav');
      expect(transcripts.map((t) => entityFilename(t))).toEqual(['XX1-0001-A.eaf']);
    });

    it('returns nothing for a media file with no annotation', () => {
      expect(findTranscriptsForFile(crate, 'XX1-0001-B.mp3')).toEqual([]);
    });

    it('returns nothing for an unknown media file', () => {
      expect(findTranscriptsForFile(crate, 'XX1-0001-Z.mp3')).toEqual([]);
    });

    it('does not treat non-eaf sidecars as transcripts', () => {
      const transcripts = findTranscriptsForFile(crate, 'XX1-0001-A.mp3');
      expect(transcripts.some((t) => entityFilename(t)?.endsWith('.xml'))).toBe(false);
    });
  });
});
