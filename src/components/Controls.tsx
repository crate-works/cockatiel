import { PauseIcon, PlayIcon } from 'lucide-react';
import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useMediaPlayerState } from '@/hooks/useMediaPlayerState';
import { selectIsReady } from '@/lib/media-player/state';
import { TimeDisplay } from './TimeDisplay';
import { useMediaPlayer } from './Waveform';

export const Controls = () => {
  const player = useMediaPlayer();
  const isReady = useMediaPlayerState(player, selectIsReady);
  const isPlaying = useMediaPlayerState(player, (s) => s.isPlaying);

  const handlePlayPause = useCallback(() => {
    player?.playPause();
  }, [player]);

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" className="h-8 gap-1.5 px-3" disabled={!isReady} onClick={handlePlayPause}>
        {isPlaying ? <PauseIcon className="size-3.5" /> : <PlayIcon className="size-3.5" />}
        {isPlaying ? 'Pause' : 'Play'}
      </Button>
      <TimeDisplay />
    </div>
  );
};
