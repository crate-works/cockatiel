import { useSyncExternalStore } from 'react';
import { initialMediaPlayerState } from '@/lib/media-player/state';
import type { MediaPlayer, MediaPlayerState } from '@/lib/media-player/types';

const noopSubscribe = () => () => {};

export const useMediaPlayerState = <T>(player: MediaPlayer | null, selector: (state: MediaPlayerState) => T): T => {
  const getSnapshot = () => selector(player ? player.getState() : initialMediaPlayerState);
  return useSyncExternalStore(player ? player.subscribe : noopSubscribe, getSnapshot, getSnapshot);
};
