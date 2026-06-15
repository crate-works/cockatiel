import { createRootRoute, Outlet } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo } from 'react';
import { AppShellProvider } from '@/app-shell';
import { ConfirmDownloadDialog } from '@/components/ConfirmDownloadDialog';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { StatusBar } from '@/components/StatusBar';
import { Toaster } from '@/components/ui/sonner';
import { useAutoSegment } from '@/hooks/useAutoSegment';
import { useRemoteAudioLoad } from '@/hooks/useRemoteAudioLoad';
import { startAutoSave } from '@/lib/persistence/subscribe';
import { useAppStore } from '@/lib/store';

const RootLayout = () => {
  const navigate = Route.useNavigate();
  const editorStatus = useAppStore((s) => s.editorStatus);

  // A session is ready (restored or freshly segmented) — route to its URL.
  // `replace` so the browser back button skips the transient processing step and
  // returns to wherever the load was triggered (/ or /catalog).
  const onReady = useCallback(
    (fingerprint: string) => {
      void navigate({ to: '/session/$fingerprint', params: { fingerprint }, replace: true });
    },
    [navigate],
  );

  const { audioFile, cancel: cancelSegment, processFile, setAudioFile } = useAutoSegment({ onReady });
  const {
    cancel: cancelDownload,
    loadFromCatalog,
    loadFromUrl,
    pendingConfirmation,
    resolveConfirmation,
  } = useRemoteAudioLoad({ processFile, setAudioFile, onReady });

  useEffect(() => startAutoSave(), []);

  const handleFileSelected = useCallback(
    (file: File, handle?: FileSystemFileHandle) => {
      processFile(file, { handle });
    },
    [processFile],
  );

  const handleResegment = useCallback(() => {
    if (audioFile) {
      processFile(audioFile);
    }
  }, [audioFile, processFile]);

  const handleCancelProcessing = useCallback(() => {
    cancelDownload();
    cancelSegment();
  }, [cancelDownload, cancelSegment]);

  const appShell = useMemo(
    () => ({ audioFile, processFile, setAudioFile, handleFileSelected, handleResegment, loadFromUrl, loadFromCatalog }),
    [audioFile, processFile, setAudioFile, handleFileSelected, handleResegment, loadFromUrl, loadFromCatalog],
  );

  return (
    <AppShellProvider value={appShell}>
      <div className="min-h-screen bg-background text-foreground">
        <Header />

        <main className="mx-auto max-w-6xl px-4 py-6">
          {/* Processing is a transient, cross-route state: while a load runs we
              cover the active route with the StatusBar; on ready we navigate to
              /session/:fingerprint. */}
          {editorStatus === 'processing' ? <StatusBar onCancel={handleCancelProcessing} /> : <Outlet />}
        </main>

        <Footer />
        <ConfirmDownloadDialog
          filename={pendingConfirmation?.filename ?? ''}
          host={pendingConfirmation?.host ?? ''}
          onCancel={() => resolveConfirmation(false, false)}
          onConfirm={(dontAskAgain) => resolveConfirmation(true, dontAskAgain)}
          open={pendingConfirmation !== null}
          size={pendingConfirmation?.size}
        />
        <Toaster position="top-center" richColors />
      </div>
    </AppShellProvider>
  );
};

export const Route = createRootRoute({
  component: RootLayout,
});
