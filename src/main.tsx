import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
// Direct path import (not the arocapi barrel) so loading the runtime config
// doesn't pull in the stores before providers are populated.
import { loadProviders } from './lib/arocapi/providers';
import { createQueryClient } from './lib/query-client';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element not found');
}

// Load the runtime provider config (config.json) before importing the app. The
// dynamic import guarantees the stores — notably auth/store.ts, which hydrates
// sessions per provider at creation time — initialise only after providers exist.
const bootstrap = async () => {
  await loadProviders();
  const { default: App } = await import('./App.tsx');
  const queryClient = createQueryClient();

  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
};

void bootstrap();
