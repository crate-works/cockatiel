import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { useAppShell } from '@/app-shell';
import { Workbench } from '@/components/Workbench';

interface IndexSearch {
  // Deep-link: ?audio=<url> auto-loads a remote recording (then routes to its
  // session). Preserved from the pre-router behaviour.
  audio?: string;
}

const Landing = () => {
  const { audio } = Route.useSearch();
  const { handleFileSelected, loadFromUrl, loadFromCatalog } = useAppShell();
  const triggered = useRef(false);

  useEffect(() => {
    if (audio && !triggered.current) {
      triggered.current = true;
      void loadFromUrl(audio);
    }
  }, [audio, loadFromUrl]);

  return <Workbench onFileSelected={handleFileSelected} onLoadUrl={loadFromUrl} onLoadCatalog={loadFromCatalog} />;
};

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): IndexSearch => (typeof search.audio === 'string' && search.audio ? { audio: search.audio } : {}),
  component: Landing,
});
