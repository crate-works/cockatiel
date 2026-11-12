import { createEmitter } from './emitter';
import type { MediaPlayerState } from './types';

export const initialMediaPlayerState: MediaPlayerState = Object.freeze({
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  loadPhase: 'idle',
  minPxPerSec: 0,
  pxPerSec: 0,
  viewport: Object.freeze({ pixelsPerSecond: 0, visibleEndTime: 0, visibleStartTime: 0 }),
});

export const selectIsReady = (state: MediaPlayerState): boolean => state.loadPhase === 'ready';

export const selectReadyDuration = (state: MediaPlayerState): number => (selectIsReady(state) ? state.duration : 0);

// Each change replaces the snapshot and notifies subscribers; a no-op patch keeps the same object.
export const createSnapshotCell = () => {
  let snapshot = initialMediaPlayerState;
  const changes = createEmitter<MediaPlayerState>();
  return {
    clear: changes.clear,
    get: (): MediaPlayerState => snapshot,
    subscribe: changes.on,
    update: (patch: Partial<MediaPlayerState>): void => {
      const keys = Object.keys(patch) as (keyof MediaPlayerState)[];
      if (keys.every((key) => Object.is(patch[key], snapshot[key]))) {
        return;
      }
      snapshot = { ...snapshot, ...patch };
      changes.emit(snapshot);
    },
  };
};
