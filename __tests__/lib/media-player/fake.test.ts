import { describe, expect, it, vi } from 'vitest';
import type { MediaPlayerEvent } from '@/lib/media-player/types';
import { createFakeMediaPlayer } from './fake';

describe('createFakeMediaPlayer', () => {
  it('reports readiness through the load phase, with the duration already set', () => {
    const player = createFakeMediaPlayer();
    const events: MediaPlayerEvent[] = [];
    player.on((e) => events.push(e));

    player.simulateReady(42);

    expect(events).toEqual([{ phase: 'ready', type: 'load-phase' }]);
    expect(player.getState()).toMatchObject({ duration: 42, loadPhase: 'ready' });
  });

  it('replaces the state snapshot on change and keeps it when nothing changes', () => {
    const player = createFakeMediaPlayer();
    const before = player.getState();
    expect(player.getState()).toBe(before);

    player.play();

    expect(player.getState()).not.toBe(before);
    expect(before.isPlaying).toBe(false);
  });

  it('notifies subscribers of every state change, including ones with no event', () => {
    const player = createFakeMediaPlayer();
    const listener = vi.fn();
    player.subscribe(listener);

    player.seek(5);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('neither replaces the snapshot nor notifies when a change sets the same values', () => {
    const player = createFakeMediaPlayer();
    const before = player.getState();
    const listener = vi.fn();
    player.subscribe(listener);

    player.pause();

    expect(player.getState()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it('clears the previous file from the snapshot when a new load starts', async () => {
    const player = createFakeMediaPlayer();
    player.simulateReady(60);
    player.play();
    player.seek(12);

    await player.loadBlob(new File(['x'], 'b.wav'));

    expect(player.getState()).toMatchObject({ currentTime: 0, duration: 0, isPlaying: false, loadPhase: 'loading', pxPerSec: 0 });
  });

  it('toggles isPlaying on play/pause/playPause', () => {
    const player = createFakeMediaPlayer();
    player.play();
    expect(player.getState().isPlaying).toBe(true);
    player.pause();
    expect(player.getState().isPlaying).toBe(false);
    player.playPause();
    expect(player.getState().isPlaying).toBe(true);
    player.playPause();
    expect(player.getState().isPlaying).toBe(false);
  });

  it('emits timeupdate and mutates currentTime', () => {
    const player = createFakeMediaPlayer();
    const events: MediaPlayerEvent[] = [];
    player.on((e) => events.push(e));
    player.simulateTimeUpdate(5.5);
    expect(player.getState().currentTime).toBe(5.5);
    expect(events).toEqual([{ currentTime: 5.5, type: 'timeupdate' }]);
  });

  it('mirrors bounds-changed emit into the regions map', () => {
    const player = createFakeMediaPlayer();
    player.syncRegions({ loopOnSelect: false, segments: [{ end: 2, id: 'a', speaker: 0, start: 0 }], selectedId: null });
    player.simulateBoundsChanged('a', 0.5, 3);
    expect(player.regions().get('a')).toEqual({ end: 3, id: 'a', speaker: 0, start: 0.5 });
  });

  it('fans out events to multiple listeners and stops when unsubscribed', () => {
    const player = createFakeMediaPlayer();
    const a = vi.fn();
    const b = vi.fn();
    const offA = player.on(a);
    player.on(b);
    player.simulateTimeUpdate(10);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    offA();
    player.simulateTimeUpdate(20);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(2);
  });

  it('disposes and clears listeners', () => {
    const player = createFakeMediaPlayer();
    const listener = vi.fn();
    player.on(listener);
    expect(player.disposed()).toBe(false);
    player.dispose();
    expect(player.disposed()).toBe(true);
    player.simulateReady(10);
    expect(listener).not.toHaveBeenCalled();
  });
});
