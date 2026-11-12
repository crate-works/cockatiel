import WaveSurfer from 'wavesurfer.js';
import MinimapPlugin from 'wavesurfer.js/dist/plugins/minimap.esm.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom.esm.js';
import { createEmitter } from './emitter';
import { createWavesurferRegionSync } from './region-sync/wavesurfer';
import { createSnapshotCell, initialMediaPlayerState, selectIsReady } from './state';
import type { DesiredRegions, LoadPhase, MediaPlayer, MediaPlayerEvent, Viewport } from './types';
import { computeMinPxPerSec, computeZoomWindow } from './zoom-math';

export const createWavesurferMediaPlayer = (container: HTMLElement, colourFor: (speaker: number) => string, media?: HTMLMediaElement | null): MediaPlayer => {
  const regions = RegionsPlugin.create();
  const zoomPlugin = ZoomPlugin.create({ exponentialZooming: true, iterations: 30, scale: 0.5 });
  const minimap = MinimapPlugin.create({
    height: 32,
    overlayColor: 'oklch(0.45 0.05 55 / 30%)',
    progressColor: 'oklch(0.45 0.08 55)',
    waveColor: 'oklch(0.65 0.04 55)',
  });

  const ws = WaveSurfer.create({
    container,
    cursorColor: 'oklch(0.45 0.18 25)',
    cursorWidth: 2,
    height: 160,
    // Drive an external <video>/<audio> element when supplied so video frames
    // render in our own surface while WaveSurfer still draws the audio track.
    ...(media ? { media } : {}),
    normalize: true,
    plugins: [regions, zoomPlugin, minimap],
    progressColor: 'oklch(0.35 0.12 55)',
    waveColor: 'oklch(0.55 0.06 55)',
  });

  const events = createEmitter<MediaPlayerEvent>();
  const emit = events.emit;

  const snapshot = createSnapshotCell();
  const { get: current, update } = snapshot;

  const setLoadPhase = (phase: LoadPhase): void => {
    update({ loadPhase: phase });
    emit({ phase, type: 'load-phase' });
  };

  const fitPxPerSec = (): number => computeMinPxPerSec(container.clientWidth, ws.getDuration());

  // Viewport emission — rAF-coalesced so scroll/zoom drags don't re-render tiers per frame.
  let rafId: number | null = null;
  let pendingViewport: [number, number] | null = null;

  const publishViewport = (visibleStartTime: number, visibleEndTime: number): void => {
    // Use the authoritative zoom (px-per-second the waveform actually rendered
    // at) rather than re-deriving it from the visible window, so transcript
    // tiers scroll at exactly the waveform's rate. Fall back to the window only
    // before the first zoom is known.
    const { pxPerSec } = current();
    const pps = pxPerSec > 0 ? pxPerSec : container.clientWidth / (visibleEndTime - visibleStartTime || 1);
    const viewport: Viewport = { pixelsPerSecond: pps, visibleEndTime, visibleStartTime };
    update({ viewport });
    emit({ type: 'viewport', viewport });
  };

  const scheduleViewport = (visibleStartTime: number, visibleEndTime: number): void => {
    pendingViewport = [visibleStartTime, visibleEndTime];
    if (rafId !== null) {
      return;
    }
    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (!pendingViewport) {
        return;
      }
      const [s, e] = pendingViewport;
      pendingViewport = null;
      publishViewport(s, e);
    });
  };

  const emitFullViewport = (): void => {
    const duration = ws.getDuration();
    if (duration > 0) {
      publishViewport(0, duration);
    }
  };

  // Region-sync calls into the regions plugin, which needs a decoded audio duration
  // to position regions. syncRegions before `ready` is buffered and flushed here.
  let pendingRegions: DesiredRegions | null = null;

  const unsubReady = ws.on('ready', (duration: number) => {
    // wavesurfer still fires 'ready' for a superseded load, but only sets the phase for a current one.
    if (ws.getState().loadPhase.value !== 'ready') {
      return;
    }
    const minPxPerSec = fitPxPerSec();
    update({ duration, minPxPerSec, pxPerSec: minPxPerSec });
    setLoadPhase('ready');
    emitFullViewport();
    if (pendingRegions) {
      regionSync.sync(pendingRegions);
      pendingRegions = null;
    }
  });

  // wavesurfer never reports 'fetching' for blobs, so 'loading' is set by loadBlob.
  const unsubLoadPhase = ws.getState().loadPhase.subscribe((phase) => {
    if (phase === 'decoding' || phase === 'error') {
      setLoadPhase(phase);
    }
  });

  const unsubPlay = ws.on('play', () => {
    update({ isPlaying: true });
    emit({ type: 'play' });
  });

  const unsubPause = ws.on('pause', () => {
    update({ isPlaying: false });
    emit({ type: 'pause' });
  });

  const unsubTime = ws.on('timeupdate', (currentTime: number) => {
    update({ currentTime });
    emit({ currentTime, type: 'timeupdate' });
  });

  const unsubZoom = ws.on('zoom', (pxPerSec: number) => {
    update({ pxPerSec });
    emit({ minPxPerSec: current().minPxPerSec, pxPerSec, type: 'zoom' });
    // A zoom that leaves the scroll position unchanged (e.g. the playhead at the
    // very start) emits no native scroll event, so the viewport — and every
    // transcript tier positioned from it — would otherwise keep the previous
    // zoom's scale. Recompute the visible window at the new scale and republish.
    if (selectIsReady(current()) && pxPerSec > 0) {
      const visibleStartTime = ws.getScroll() / pxPerSec;
      const visibleEndTime = visibleStartTime + ws.getWidth() / pxPerSec;
      scheduleViewport(visibleStartTime, visibleEndTime);
    }
  });

  const unsubScroll = ws.on('scroll', (visibleStartTime: number, visibleEndTime: number) => {
    scheduleViewport(visibleStartTime, visibleEndTime);
  });

  // Container-width tracking — recompute minPxPerSec when the layout changes.
  const resizeObserver = new ResizeObserver(() => {
    if (selectIsReady(current())) {
      update({ minPxPerSec: fitPxPerSec() });
    }
  });
  resizeObserver.observe(container);

  const regionSync = createWavesurferRegionSync(ws, regions, container, colourFor);
  const unsubRegionSync = regionSync.on((event) => {
    switch (event.type) {
      case 'selected':
        emit({ id: event.id, type: 'region-selected' });
        break;
      case 'cleared':
        emit({ type: 'region-cleared' });
        break;
      case 'bounds-changed':
        emit({ end: event.end, id: event.id, start: event.start, type: 'region-bounds-changed' });
        break;
    }
  });

  // StrictMode loadBlob guard — don't reload the same file blob twice.
  let loadedFile: File | null = null;

  return {
    clientXToTime: (clientX) => regionSync.clientXToTime(clientX),
    dispose: () => {
      unsubReady();
      unsubLoadPhase();
      unsubPlay();
      unsubPause();
      unsubTime();
      unsubZoom();
      unsubScroll();
      unsubRegionSync();
      regionSync.dispose();
      resizeObserver.disconnect();
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      events.clear();
      snapshot.clear();
      ws.destroy();
    },
    getState: current,
    loadBlob: async (file) => {
      if (loadedFile === file) {
        return;
      }
      loadedFile = file;
      // wavesurfer keeps the last zoom across loads; a new file starts fitted to the width.
      if (current().pxPerSec > current().minPxPerSec) {
        ws.setOptions({ minPxPerSec: 0 });
      }
      update({ ...initialMediaPlayerState, loadPhase: 'loading' });
      emit({ phase: 'loading', type: 'load-phase' });
      await ws.loadBlob(file);
    },
    on: events.on,
    pause: () => {
      ws.pause();
    },
    play: () => {
      void ws.play();
    },
    playPause: () => {
      void ws.playPause();
    },
    seek: (time) => {
      ws.setTime(time);
    },
    setZoom: (pxPerSec) => {
      ws.zoom(pxPerSec);
    },
    skip: (delta) => {
      ws.skip(delta);
    },
    subscribe: snapshot.subscribe,
    syncRegions: (desired) => {
      if (!selectIsReady(current())) {
        pendingRegions = desired;
        return;
      }
      regionSync.sync(desired);
    },
    zoomToWindow: (start, end) => {
      const window = computeZoomWindow(container.clientWidth, ws.getDuration(), start, end);
      if (!window) {
        return;
      }
      ws.zoom(window.pxPerSec);
      ws.setScroll(window.scroll);
    },
  };
};
