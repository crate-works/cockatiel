import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAppShell } from '@/app-shell';
import { AnnotationTier } from '@/components/AnnotationTier';
import { Controls } from '@/components/Controls';
import { DropZone } from '@/components/DropZone';
import { ExportMenu } from '@/components/ExportMenu';
import { HelpButton } from '@/components/HelpButton';
import { KeyboardHelp } from '@/components/KeyboardHelp';
import { LoopToggle } from '@/components/LoopToggle';
import { RestoreBanner } from '@/components/RestoreBanner';
import { SpeakerPanel } from '@/components/SpeakerPanel';
import { VadSettings } from '@/components/VadSettings';
import { type TimelineViewport, useMediaPlayer, Waveform } from '@/components/Waveform';
import { ZoomControl } from '@/components/ZoomControl';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { loadSession } from '@/lib/persistence/storage';
import { useAppStore } from '@/lib/store';

const defaultViewport: TimelineViewport = {
  pixelsPerSecond: 100,
  visibleEndTime: 60,
  visibleStartTime: 0,
};

const WorkspaceKeyboardShortcuts = () => {
  const player = useMediaPlayer();
  useKeyboardShortcuts(player);
  return null;
};

const SessionEditor = () => {
  const { fingerprint } = Route.useParams();
  const navigate = Route.useNavigate();
  const { audioFile, setAudioFile, handleFileSelected, handleResegment, loadFromUrl, loadFromCatalog } = useAppShell();
  const [viewport, setViewport] = useState<TimelineViewport>(defaultViewport);
  const [helpOpen, setHelpOpen] = useState(false);

  const sourceUrl = useAppStore((s) => s.sourceUrl);
  const catalogSource = useAppStore((s) => s.catalogSource);

  // Cold load (fresh page / login-return / a different session): hydrate the
  // transcript from IndexedDB, then re-acquire the media by its source. When the
  // store already holds this fingerprint we're warm (navigated in-tab) and the
  // load flow that set it is already managing the audio — nothing to do.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run only when the routed fingerprint changes; the handlers are stable for a given session
  useEffect(() => {
    if (useAppStore.getState().fingerprint === fingerprint) {
      return;
    }
    let cancelled = false;
    (async () => {
      const session = await loadSession(fingerprint);
      if (cancelled) {
        return;
      }
      if (!session) {
        toast.error('That session no longer exists.');
        void navigate({ to: '/', replace: true });
        return;
      }
      const store = useAppStore.getState();
      setAudioFile(null);
      store.hydrateFromStoredSession(session);
      store.setEditorStatus('ready');
      // Re-acquire media. URL/catalog sources reload themselves; a local file
      // needs a user gesture (RestoreBanner) or a re-drop (DropZone) below.
      if (session.sourceUrl) {
        void loadFromUrl(session.sourceUrl);
      } else if (session.catalogSource) {
        void loadFromCatalog(session.catalogSource);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fingerprint]);

  // A local-file session whose audio we can't auto-restore (no in-memory file):
  // offer the RestoreBanner (file-handle re-open) and a re-drop zone, preserving
  // the transcript.
  const needsLocalMedia = !audioFile && !sourceUrl && !catalogSource;

  return (
    <div className="space-y-3">
      {!audioFile && <RestoreBanner onResume={handleFileSelected} />}
      {needsLocalMedia && (
        <div className="flex justify-center">
          <DropZone onFileSelected={handleFileSelected} />
        </div>
      )}

      <Waveform audioFile={audioFile} onViewportChange={setViewport}>
        <WorkspaceKeyboardShortcuts />
        <div className="sticky top-12 z-30 -mx-4 flex items-center justify-between border-b border-border bg-card/90 px-4 py-2 backdrop-blur">
          <Controls />
          <div className="flex items-center gap-3">
            <ZoomControl />
            <LoopToggle />
            <ExportMenu />
            <HelpButton onOpen={() => setHelpOpen(true)} />
          </div>
        </div>
        <AnnotationTier label="Transcript" viewport={viewport} />
      </Waveform>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SpeakerPanel />
        <VadSettings onResegment={handleResegment} />
      </div>

      <KeyboardHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
};

export const Route = createFileRoute('/session/$fingerprint')({
  component: SessionEditor,
});
