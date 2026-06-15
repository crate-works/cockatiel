import { afterEach, describe, expect, it } from 'vitest';
import { useAppStore } from '@/lib/store';

describe('useAppStore', () => {
  afterEach(() => {
    useAppStore.getState().reset();
  });

  describe('loadSegments', () => {
    it('creates annotations from VAD segments with default speaker', () => {
      const store = useAppStore.getState();
      store.loadSegments([
        { end: 2.5, start: 0.5 },
        { end: 5.0, start: 3.0 },
      ]);

      const { segments, editorStatus } = useAppStore.getState();
      expect(segments).toHaveLength(2);
      expect(segments[0].start).toBe(0.5);
      expect(segments[0].end).toBe(2.5);
      expect(segments[0].value).toBe('');
      expect(segments[0].speaker).toBe(0);
      expect(segments[0].id).toBeTruthy();
      expect(editorStatus).toBe('ready');
    });
  });

  describe('loadImportedSegments', () => {
    it('loads pre-filled segments and their speaker names, ready to edit', () => {
      const store = useAppStore.getState();
      store.loadImportedSegments(
        [
          { end: 2, id: 'a', speaker: 0, start: 0, value: 'hello' },
          { end: 4, id: 'b', speaker: 1, start: 2, value: 'world' },
        ],
        ['Ada', 'Ben'],
      );

      const { segments, speakerNames, editorStatus, defaultSpeaker } = useAppStore.getState();
      expect(segments).toHaveLength(2);
      expect(segments[1]).toMatchObject({ speaker: 1, value: 'world' });
      expect(speakerNames).toEqual(['Ada', 'Ben']);
      expect(defaultSpeaker).toBe(0);
      expect(editorStatus).toBe('ready');
    });

    it('falls back to a default speaker name when none are supplied', () => {
      const store = useAppStore.getState();
      store.loadImportedSegments([{ end: 1, id: 'a', speaker: 0, start: 0, value: '' }], []);
      expect(useAppStore.getState().speakerNames).toEqual(['Speaker 1']);
    });
  });

  describe('updateSegmentText', () => {
    it('updates text for a specific segment', () => {
      const store = useAppStore.getState();
      store.loadSegments([{ end: 2, start: 0 }]);

      const id = useAppStore.getState().segments[0].id;
      store.updateSegmentText(id, 'hello world');

      expect(useAppStore.getState().segments[0].value).toBe('hello world');
    });
  });

  describe('speaker management', () => {
    it('sets speaker count and creates names', () => {
      const store = useAppStore.getState();
      store.setSpeakerCount(3);

      const { speakerNames } = useAppStore.getState();
      expect(speakerNames).toEqual(['Speaker 1', 'Speaker 2', 'Speaker 3']);
    });

    it('clamps speaker count to 1-8', () => {
      const store = useAppStore.getState();
      store.setSpeakerCount(0);
      expect(useAppStore.getState().speakerNames).toHaveLength(1);

      store.setSpeakerCount(10);
      expect(useAppStore.getState().speakerNames).toHaveLength(8);
    });

    it('reassigns orphaned segments when reducing speaker count', () => {
      const store = useAppStore.getState();
      store.setSpeakerCount(3);
      store.loadSegments([{ end: 2, start: 0 }]);

      const id = useAppStore.getState().segments[0].id;
      store.assignSpeaker(id, 2); // Speaker 3 (index 2)
      store.setSpeakerCount(2); // Remove Speaker 3

      expect(useAppStore.getState().segments[0].speaker).toBe(1); // Reassigned to last valid
    });

    it('assigns all segments to a speaker', () => {
      const store = useAppStore.getState();
      store.setSpeakerCount(2);
      store.loadSegments([
        { end: 2, start: 0 },
        { end: 4, start: 2 },
      ]);
      store.assignAllToSpeaker(1);

      const { segments } = useAppStore.getState();
      expect(segments.every((s) => s.speaker === 1)).toBe(true);
    });

    it('updates speaker name', () => {
      const store = useAppStore.getState();
      store.setSpeakerCount(2);
      store.setSpeakerName(0, 'Alice');

      expect(useAppStore.getState().speakerNames[0]).toBe('Alice');
    });
  });

  describe('VAD config', () => {
    it('partially updates VAD config', () => {
      const store = useAppStore.getState();
      store.setVadConfig({ threshold: 0.7 });

      const { vadConfig } = useAppStore.getState();
      expect(vadConfig.threshold).toBe(0.7);
      expect(vadConfig.minSilenceDuration).toBe(0.3); // unchanged
    });
  });
});
