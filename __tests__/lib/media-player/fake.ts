import { createEmitter } from '@/lib/media-player/emitter';
import { createSnapshotCell, initialMediaPlayerState } from '@/lib/media-player/state';
import type { DesiredRegions, LoadPhase, MediaPlayer, MediaPlayerEvent, RegionSpec } from '@/lib/media-player/types';
import { computeMinPxPerSec, computeZoomWindow } from '@/lib/media-player/zoom-math';

export interface FakeMediaPlayer extends MediaPlayer {
  disposed(): boolean;
  emit(event: MediaPlayerEvent): void;
  lastDesiredRegions(): DesiredRegions | null;
  regions(): ReadonlyMap<string, RegionSpec>;
  setClientXToTime(fn: (clientX: number) => number | null): void;
  simulateBoundsChanged(id: string, start: number, end: number): void;
  simulateLoadPhase(phase: LoadPhase): void;
  simulateReady(duration: number): void;
  simulateTimeUpdate(time: number): void;
}

interface FakeMediaPlayerOptions {
  containerWidth?: number;
}

export const createFakeMediaPlayer = (options: FakeMediaPlayerOptions = {}): FakeMediaPlayer => {
  const events = createEmitter<MediaPlayerEvent>();
  const dom = new Map<string, RegionSpec>();
  let latest: DesiredRegions | null = null;
  let isDisposed = false;
  let clientXToTimeImpl: (clientX: number) => number | null = () => null;
  const containerWidth = options.containerWidth ?? 1000;

  const snapshot = createSnapshotCell();
  const { get: current, update } = snapshot;

  const emit = (event: MediaPlayerEvent): void => {
    // Mirror the real adapter: a bounds-changed event means the DOM just moved,
    // so update our "DOM" map before notifying listeners. This lets snap-back
    // be asserted via regions() after a subsequent syncRegions.
    if (event.type === 'region-bounds-changed') {
      const prev = dom.get(event.id);
      if (prev) {
        dom.set(event.id, { ...prev, end: event.end, start: event.start });
      }
    }
    events.emit(event);
  };

  const setLoadPhase = (phase: LoadPhase): void => {
    update({ loadPhase: phase });
    emit({ phase, type: 'load-phase' });
  };

  return {
    clientXToTime: (clientX) => clientXToTimeImpl(clientX),
    dispose: () => {
      isDisposed = true;
      events.clear();
      snapshot.clear();
    },
    disposed: () => isDisposed,
    emit,
    getState: current,
    lastDesiredRegions: () => latest,
    loadBlob: async () => {
      update({ ...initialMediaPlayerState, loadPhase: 'loading' });
      emit({ phase: 'loading', type: 'load-phase' });
    },
    on: events.on,
    pause: () => {
      update({ isPlaying: false });
      emit({ type: 'pause' });
    },
    play: () => {
      update({ isPlaying: true });
      emit({ type: 'play' });
    },
    playPause: () => {
      update({ isPlaying: !current().isPlaying });
      emit({ type: current().isPlaying ? 'play' : 'pause' });
    },
    regions: () => dom,
    seek: (time) => {
      update({ currentTime: time });
    },
    setClientXToTime: (fn) => {
      clientXToTimeImpl = fn;
    },
    setZoom: (pxPerSec) => {
      update({ pxPerSec });
      emit({ minPxPerSec: current().minPxPerSec, pxPerSec, type: 'zoom' });
    },
    simulateBoundsChanged: (id, start, end) => {
      emit({ end, id, start, type: 'region-bounds-changed' });
    },
    simulateLoadPhase: setLoadPhase,
    simulateReady: (duration) => {
      const minPxPerSec = computeMinPxPerSec(containerWidth, duration);
      update({ duration, minPxPerSec, pxPerSec: minPxPerSec });
      setLoadPhase('ready');
    },
    simulateTimeUpdate: (time) => {
      update({ currentTime: time });
      emit({ currentTime: time, type: 'timeupdate' });
    },
    skip: (delta) => {
      update({ currentTime: Math.max(0, current().currentTime + delta) });
    },
    subscribe: snapshot.subscribe,
    syncRegions: (desired) => {
      latest = desired;
      dom.clear();
      for (const spec of desired.segments) {
        dom.set(spec.id, spec);
      }
    },
    zoomToWindow: (start, end) => {
      const window = computeZoomWindow(containerWidth, current().duration, start, end);
      if (window) {
        update({ pxPerSec: window.pxPerSec });
        emit({ minPxPerSec: current().minPxPerSec, pxPerSec: window.pxPerSec, type: 'zoom' });
      }
    },
  };
};
