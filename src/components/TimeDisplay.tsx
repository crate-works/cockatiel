import { useEffect, useRef } from 'react';
import { useMediaPlayerState } from '@/hooks/useMediaPlayerState';
import { formatTime } from '@/lib/constants';
import { selectReadyDuration } from '@/lib/media-player/state';
import { useMediaPlayer } from './Waveform';

export const TimeDisplay = () => {
  const player = useMediaPlayer();
  const spanRef = useRef<HTMLSpanElement>(null);
  const duration = useMediaPlayerState(player, selectReadyDuration);

  // The current time is written straight to the DOM: timeupdate fires too often to re-render for.
  useEffect(() => {
    const durationText = formatTime(duration);
    const write = (currentTime: number) => {
      if (spanRef.current) {
        spanRef.current.textContent = `${formatTime(currentTime)} / ${durationText}`;
      }
    };
    write(duration > 0 && player ? player.getState().currentTime : 0);
    if (!player) {
      return;
    }
    return player.on((event) => {
      if (event.type === 'timeupdate') {
        write(event.currentTime);
      }
    });
  }, [player, duration]);

  return (
    <span ref={spanRef} className="font-mono text-xs tabular-nums text-muted-foreground">
      0:00.0 / 0:00.0
    </span>
  );
};
