import { Loader2Icon } from 'lucide-react';
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { isVideoFile } from '@/hooks/useAudioFilePicker';
import { useMediaPlayerBridge } from '@/hooks/useMediaPlayerBridge';
import { useMediaPlayerState } from '@/hooks/useMediaPlayerState';
import { getSpeakerColour } from '@/lib/constants';
import type { LoadPhase, MediaPlayer, Viewport } from '@/lib/media-player/types';
import { createWavesurferMediaPlayer } from '@/lib/media-player/wavesurfer';
import { type MediaDownload, selectHasRemoteSource, useAppStore } from '@/lib/store';
import { getErrorMessage, isAbortError } from '@/lib/utils';
import { SegmentContextMenu } from './SegmentContextMenu';

interface Overlay {
  busy: boolean;
  label: string;
}

const LOADING: Overlay = { busy: true, label: 'Loading media…' };

const describeNoFileOverlay = (download: MediaDownload, hasRemoteSource: boolean): Overlay => {
  if (download.kind === 'downloading') {
    const percent = download.fraction === undefined ? '' : ` ${Math.round(download.fraction * 100)}%`;
    return { busy: true, label: `Downloading media…${percent}` };
  }
  if (download.kind === 'failed') {
    return { busy: false, label: "Couldn't download media" };
  }
  if (!hasRemoteSource) {
    return { busy: false, label: 'No media loaded' };
  }
  return LOADING;
};

const describePlayerOverlay = (phase: LoadPhase): Overlay | null => {
  switch (phase) {
    case 'ready':
      return null;
    case 'decoding':
      return { busy: true, label: 'Decoding audio…' };
    case 'error':
      return { busy: false, label: "Couldn't load media" };
    default:
      return LOADING;
  }
};

const MediaPlayerContext = createContext<MediaPlayer | null>(null);

export const useMediaPlayer = (): MediaPlayer | null => useContext(MediaPlayerContext);

export type TimelineViewport = Viewport;

interface WaveformProps {
  audioFile: File | null;
  children?: React.ReactNode;
  onViewportChange?: (viewport: TimelineViewport) => void;
}

export const Waveform = ({ audioFile, children, onViewportChange }: WaveformProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [player, setPlayer] = useState<MediaPlayer | null>(null);

  // A <video> element backs every load (it plays audio-only files just as well),
  // but we only reveal it when the file is actually video.
  const isVideo = audioFile ? isVideoFile(audioFile) : false;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const p = createWavesurferMediaPlayer(container, getSpeakerColour, videoRef.current);
    setPlayer(p);
    return () => {
      p.dispose();
      setPlayer(null);
    };
  }, []);

  // Layout effect so the player's synchronous 'loading' replaces the previous file's phase before paint.
  useLayoutEffect(() => {
    if (!player || !audioFile) {
      return;
    }
    player.loadBlob(audioFile).catch((err: unknown) => {
      if (isAbortError(err)) {
        return;
      }
      console.error('Failed to load audio:', err);
      useAppStore.getState().setStatus(`Error loading audio: ${getErrorMessage(err)}`);
      useAppStore.getState().setEditorStatus('idle');
    });
  }, [player, audioFile]);

  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;

  useEffect(() => {
    if (!player) {
      return;
    }
    const { viewport } = player.getState();
    if (viewport.pixelsPerSecond > 0) {
      onViewportChangeRef.current?.(viewport);
    }
    return player.on((event) => {
      if (event.type === 'viewport') {
        onViewportChangeRef.current?.(event.viewport);
      }
    });
  }, [player]);

  const loadPhase = useMediaPlayerState(player, (s) => s.loadPhase);

  const { getClickContext } = useMediaPlayerBridge(player);
  const mediaDownload = useAppStore((s) => s.mediaDownload);
  const hasRemoteSource = useAppStore(selectHasRemoteSource);
  const overlay = audioFile ? describePlayerOverlay(loadPhase) : describeNoFileOverlay(mediaDownload, hasRemoteSource);

  return (
    <MediaPlayerContext.Provider value={player}>
      <div className="space-y-0.5">
        {/* biome-ignore lint/a11y/useMediaCaption: transcription source, not published media */}
        <video ref={videoRef} playsInline className={isVideo ? 'mx-auto mb-2 max-h-[40vh] max-w-full rounded-md bg-black' : 'hidden'} />
        <div className="flex items-stretch">
          <div className="flex w-25 shrink-0 items-center rounded-l-md border border-r-0 border-border bg-waveform-bg px-2.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground/50">
            Waveform
          </div>

          <SegmentContextMenu getClickContext={getClickContext} className="min-w-0 flex-1">
            <div className="relative">
              <div ref={containerRef} className="min-h-40 overflow-hidden rounded-r-lg border border-border bg-waveform-bg" />
              {overlay && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-muted-foreground">
                  {overlay.busy && <Loader2Icon className="size-5 animate-spin" />}
                  <span className="font-mono text-xs uppercase tracking-widest">{overlay.label}</span>
                </div>
              )}
            </div>
          </SegmentContextMenu>
        </div>

        {children}
      </div>
    </MediaPlayerContext.Provider>
  );
};
