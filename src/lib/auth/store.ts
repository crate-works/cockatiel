import { create } from 'zustand';
import { clearTokens, loadTokens, loadUser, saveTokens, saveUser } from './storage';
import type { AuthState, TokenSet, UserClaims } from './types';

interface AuthStoreActions {
  setSession: (tokens: TokenSet, user: UserClaims | null) => void;
  signOut: () => void;
  setStatus: (status: AuthState['status'], error?: string) => void;
}

type AuthStore = AuthState & AuthStoreActions;

const initialFromStorage = (): AuthState => {
  const tokens = loadTokens();
  const user = loadUser();
  // Don't trust expired tokens at boot — surface as unauthenticated so the
  // user sees the sign-in affordance and we don't ship a stale Bearer header.
  if (!tokens || Date.now() >= tokens.expiresAt) {
    return { status: 'unauthenticated', tokens: null, user: null };
  }
  return { status: 'authenticated', tokens, user };
};

export const useAuthStore = create<AuthStore>((set) => ({
  ...initialFromStorage(),

  setSession: (tokens, user) => {
    saveTokens(tokens);
    if (user) {
      saveUser(user);
    }
    set({ status: 'authenticated', tokens, user, error: undefined });
  },

  signOut: () => {
    clearTokens();
    set({ status: 'unauthenticated', tokens: null, user: null, error: undefined });
  },

  setStatus: (status, error) => set({ status, error }),
}));

// Module-level getter used by lib/arocapi/client.ts so request building
// doesn't need to thread auth through every call site. Returns the current
// access token if present and not expired, else null.
export const getAccessToken = (): string | null => {
  const { tokens } = useAuthStore.getState();
  if (!tokens || Date.now() >= tokens.expiresAt) {
    return null;
  }
  return tokens.accessToken;
};
