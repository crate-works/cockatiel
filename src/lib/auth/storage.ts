import type { TokenSet, UserClaims } from './types';

// Tokens live in sessionStorage (dies with the tab, limits XSS exposure).
//
// PKCE verifier + state live in localStorage because Vite is configured with
// `Cross-Origin-Opener-Policy: same-origin` (required for SharedArrayBuffer / VAD).
// COOP can sever the browsing context across the cross-origin OAuth round-trip,
// which drops sessionStorage on the way back. localStorage survives. The verifier
// is single-use and consumed immediately on callback, so the longer-lived store
// is an acceptable tradeoff.

const TOKEN_KEY = 'cockatiel:auth:tokens';
const USER_KEY = 'cockatiel:auth:user';
const VERIFIER_KEY = 'cockatiel:auth:pkce-verifier';
const STATE_KEY = 'cockatiel:auth:pkce-state';

const safeSession = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
};

const safeLocal = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

const safeStorage = safeSession;

export const loadTokens = (): TokenSet | null => {
  const raw = safeStorage()?.getItem(TOKEN_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as TokenSet;
  } catch {
    return null;
  }
};

export const saveTokens = (tokens: TokenSet): void => {
  safeStorage()?.setItem(TOKEN_KEY, JSON.stringify(tokens));
};

export const clearTokens = (): void => {
  const s = safeStorage();
  s?.removeItem(TOKEN_KEY);
  s?.removeItem(USER_KEY);
};

export const loadUser = (): UserClaims | null => {
  const raw = safeStorage()?.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as UserClaims;
  } catch {
    return null;
  }
};

export const saveUser = (user: UserClaims): void => {
  safeStorage()?.setItem(USER_KEY, JSON.stringify(user));
};

export const savePending = (verifier: string, state: string): void => {
  const s = safeLocal();
  s?.setItem(VERIFIER_KEY, verifier);
  s?.setItem(STATE_KEY, state);
};

export const consumePending = (): { verifier: string; state: string } | null => {
  const s = safeLocal();
  const verifier = s?.getItem(VERIFIER_KEY);
  const state = s?.getItem(STATE_KEY);
  s?.removeItem(VERIFIER_KEY);
  s?.removeItem(STATE_KEY);
  if (!verifier || !state) {
    return null;
  }
  return { verifier, state };
};
