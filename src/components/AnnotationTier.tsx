import { useCallback, useLayoutEffect, useRef } from 'react';
import { SegmentInspect } from '@/lib/segment-ops';
import { useAppStore } from '@/lib/store';
import { AnnotationBlock } from './AnnotationBlock';
import { type ClickContext, SegmentContextMenu } from './SegmentContextMenu';
import { type TimelineViewport, useMediaPlayer } from './Waveform';

interface AnnotationTierProps {
  label: string;
  viewport: TimelineViewport;
}

// Fraction of the viewport width rendered outside the visible edges on each side
// so segments enter the DOM before they scroll in.
const VIEWPORT_BUFFER_RATIO = 0.25;

export const AnnotationTier = ({ label, viewport }: AnnotationTierProps) => {
  const segments = useAppStore((s) => s.segments);
  const selectedSegmentId = useAppStore((s) => s.selectedSegmentId);
  const trackRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const player = useMediaPlayer();

  const { pixelsPerSecond, visibleStartTime, visibleEndTime } = viewport;
  const buffer = (visibleEndTime - visibleStartTime) * VIEWPORT_BUFFER_RATIO;
  const startT = visibleStartTime - buffer;
  const endT = visibleEndTime + buffer;

  // Segments are laid out in absolute time-space (`seg.start * pps`) — the same
  // coordinate system the waveform draws in. Horizontal motion is the layer's
  // `translateX`, applied imperatively straight from media-player viewport
  // events. Bypassing React state keeps the transcript frame-locked to the
  // waveform's own scroll instead of trailing it by a render or two.
  useLayoutEffect(() => {
    if (!player) {
      return;
    }
    const applyScroll = (vp: TimelineViewport) => {
      const layer = layerRef.current;
      if (layer) {
        layer.style.transform = `translate3d(${-vp.visibleStartTime * vp.pixelsPerSecond}px, 0, 0)`;
      }
    };
    applyScroll(player.getState().viewport);
    return player.on((event) => {
      if (event.type === 'viewport') {
        applyScroll(event.viewport);
      }
    });
  }, [player]);

  const getClickContext = useCallback(
    (e: React.MouseEvent): ClickContext | null => {
      const track = trackRef.current;
      if (!track || pixelsPerSecond <= 0) {
        return null;
      }
      const rect = track.getBoundingClientRect();
      const time = (e.clientX - rect.left) / pixelsPerSecond + visibleStartTime;
      const segment = SegmentInspect.findAtTime(useAppStore.getState().segments, time);
      return { segmentId: segment?.id ?? null, time };
    },
    [pixelsPerSecond, visibleStartTime],
  );

  return (
    <div className="flex min-h-[40px] items-stretch">
      <div className="flex w-[100px] shrink-0 items-center rounded-l-md border border-r-0 border-border bg-secondary px-2.5 font-mono text-[0.65rem] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </div>

      <SegmentContextMenu getClickContext={getClickContext} className="min-w-0 flex-1">
        <div ref={trackRef} className="relative h-full overflow-hidden rounded-r-md border border-border bg-card">
          <div ref={layerRef} className="absolute inset-0 will-change-transform">
            {segments
              .filter((seg) => seg.id === selectedSegmentId || (seg.end >= startT && seg.start <= endT))
              .map((seg) => {
                const left = seg.start * pixelsPerSecond;
                const width = (seg.end - seg.start) * pixelsPerSecond;

                return <AnnotationBlock key={seg.id} annotation={seg} isSelected={seg.id === selectedSegmentId} left={left} width={width} />;
              })}
          </div>
        </div>
      </SegmentContextMenu>
    </div>
  );
};
