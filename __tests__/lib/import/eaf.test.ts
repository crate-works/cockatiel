import { describe, expect, it } from 'vitest';
import { parseEaf } from '@/lib/import/eaf';
import multiTierEaf from '../../fixtures/multi-tier.eaf?raw';
import singleTierEaf from '../../fixtures/single-tier.eaf?raw';

describe('parseEaf', () => {
  describe('single time-aligned tier (PARADISEC shape)', () => {
    const result = parseEaf(singleTierEaf);

    it('maps the one tier to a single speaker', () => {
      expect(result.speakerNames).toEqual(['Speaker 1']);
    });

    it('imports every alignable annotation, keeping the empty one', () => {
      expect(result.segments).toHaveLength(4);
      expect(result.segments.every((s) => s.speaker === 0)).toBe(true);
    });

    it('converts millisecond times to seconds', () => {
      expect(result.segments[0]).toMatchObject({ start: 0, end: 1, value: '' });
      expect(result.segments[1]).toMatchObject({ start: 1, end: 3.5 });
    });

    it('preserves annotation text verbatim, including inline speaker markers', () => {
      expect(result.segments[1].value).toBe('{SPEAKER=Ada} Sample utterance one, with words.');
      expect(result.segments[3].value).toBe('Sample utterance three.');
    });

    it('assigns a uuid to each segment', () => {
      const ids = new Set(result.segments.map((s) => s.id));
      expect(ids.size).toBe(result.segments.length);
      expect(result.segments[0].id).toMatch(/[0-9a-f-]{36}/);
    });
  });

  describe('multiple participant tiers with a dependent tier', () => {
    const result = parseEaf(multiTierEaf);

    it('maps each time-aligned tier to a speaker named from PARTICIPANT', () => {
      expect(result.speakerNames).toEqual(['Ada', 'Ben']);
    });

    it('drops the dependent (REF_ANNOTATION) translation tier', () => {
      expect(result.segments).toHaveLength(3);
      expect(result.segments.some((s) => s.value.includes('English translation'))).toBe(false);
    });

    it('assigns segments to the correct speaker index', () => {
      const bySpeaker = (n: number) => result.segments.filter((s) => s.speaker === n).map((s) => s.value);
      expect(bySpeaker(0)).toEqual(['Ada speaks first.', 'Ada speaks again.']);
      expect(bySpeaker(1)).toEqual(['Ben interjects.']);
    });

    it('returns segments sorted by start time across tiers', () => {
      const starts = result.segments.map((s) => s.start);
      expect(starts).toEqual([...starts].sort((a, b) => a - b));
    });
  });

  it('throws on invalid XML', () => {
    expect(() => parseEaf('not xml <<<')).toThrow(/eaf|xml/i);
  });
});
