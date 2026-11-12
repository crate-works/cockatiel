import { MinusIcon, PlusIcon } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useMediaPlayerState } from '@/hooks/useMediaPlayerState';
import { selectIsReady } from '@/lib/media-player/state';
import { fromSliderValue, MAX_PX_PER_SEC, toSliderValue } from '@/lib/media-player/zoom-math';
import { useMediaPlayer } from './Waveform';

// One click of +/- applies this factor — roughly one wheel tick.
const STEP_FACTOR = 1.25;

export const ZoomControl = () => {
  const player = useMediaPlayer();
  const isReady = useMediaPlayerState(player, selectIsReady);
  const minPx = useMediaPlayerState(player, (s) => s.minPxPerSec);
  const sliderValue = useMediaPlayerState(player, (s) => toSliderValue(s.pxPerSec, s.minPxPerSec));

  const apply = useCallback(
    (next: number) => {
      player?.setZoom(fromSliderValue(next, minPx));
    },
    [player, minPx],
  );

  const stepDelta = useMemo(() => {
    if (minPx <= 0) {
      return 5;
    }
    return (100 * Math.log(STEP_FACTOR)) / Math.log(MAX_PX_PER_SEC / minPx);
  }, [minPx]);

  const handleSliderChange = useCallback(
    (value: number | readonly number[]) => {
      apply(Array.isArray(value) ? value[0] : value);
    },
    [apply],
  );

  const disabled = !isReady || minPx <= 0;

  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground/70">Zoom</span>
      <Button variant="outline" size="icon-xs" disabled={disabled} aria-label="Zoom out" onClick={() => apply(sliderValue - stepDelta)}>
        <MinusIcon />
      </Button>
      <div className="w-28 shrink-0">
        <Slider value={[sliderValue]} min={0} max={100} step={0.1} disabled={disabled} onValueChange={handleSliderChange} aria-label="Zoom" />
      </div>
      <Button variant="outline" size="icon-xs" disabled={disabled} aria-label="Zoom in" onClick={() => apply(sliderValue + stepDelta)}>
        <PlusIcon />
      </Button>
    </div>
  );
};
