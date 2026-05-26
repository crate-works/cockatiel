import { create } from 'zustand';
// Direct path import — avoids pulling the arocapi barrel which would transitively
// re-import this store via lib/arocapi/client.ts and create a circular init.
import { listProviders } from '@/lib/arocapi/providers';
import { clearTokens, loadTokens, loadUser, saveTokens, saveUser } from './storage';
import type { ProviderSession, TokenSet, UserClaims } from './types';

interface AuthStore {
  sessions: Record<string, ProviderSession | null>;
  setSession: (providerId: string, tokens: TokenSet, user: UserClaims | null) => void;
  signOut: (providerId: string) => void;
}

// On boot, hydrate sessions from sessionStorage for every known provider that
// has stored tokens. Expired tokens are discarded so the UI shows them as
// signed out rather than serving a stale Bearer header.
const initialSessions = (): Record<string, ProviderSession | null> => {
  const out: Record<string, ProviderSession | null> = {};
  for (const provider of listProviders()) {
    const tokens = loadTokens(provider.id);
    if (!tokens || Date.now() >= tokens.expiresAt) {
      out[provider.id] = null;
      continue;
    }
    out[provider.id] = { tokens, user: loadUser(provider.id) };
  }
  return out;
};

export const useAuthStore = create<AuthStore>((set) => ({
  sessions: initialSessions(),

  setSession: (providerId, tokens, user) => {
    saveTokens(providerId, tokens);
    if (user) {
      saveUser(providerId, user);
    }
    set((state) => ({ sessions: { ...state.sessions, [providerId]: { tokens, user } } }));
  },

  signOut: (providerId) => {
    clearTokens(providerId);
    set((state) => ({ sessions: { ...state.sessions, [providerId]: null } }));
  },
}));

// Module-level getter used by lib/arocapi/client.ts so request building
// doesn't need to thread auth through every call site. Returns the access
// token for the given provider if present and not expired.
export const getAccessToken = (providerId: string): string | null => {
  const session = useAuthStore.getState().sessions[providerId];
  if (!session || Date.now() >= session.tokens.expiresAt) {
    return null;
  }
  return session.tokens.accessToken;
};
