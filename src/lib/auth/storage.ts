import type { TokenSet, UserClaims } from './types';

// Per-provider session keys. Tokens live in sessionStorage (dies with the tab,
// limits XSS exposure). PKCE state lives in localStorage because Vite serves
// with COOP:same-origin (required for SharedArrayBuffer / VAD), which can
// sever the browsing context across the cross-origin OAuth round-trip and
// drop sessionStorage on the way back.

const tokenKey = (providerId: string) => `cockatiel:auth:tokens:${providerId}`;
const userKey = (providerId: string) => `cockatiel:auth:user:${providerId}`;

const VERIFIER_KEY = 'cockatiel:auth:pkce-verifier';
const STATE_KEY = 'cockatiel:auth:pkce-state';
const PROVIDER_KEY = 'cockatiel:auth:pkce-provider';

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

export const loadTokens = (providerId: string): TokenSet | null => {
  const raw = safeSession()?.getItem(tokenKey(providerId));
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as TokenSet;
  } catch {
    return null;
  }
};

export const saveTokens = (providerId: string, tokens: TokenSet): void => {
  safeSession()?.setItem(tokenKey(providerId), JSON.stringify(tokens));
};

export const clearTokens = (providerId: string): void => {
  const s = safeSession();
  s?.removeItem(tokenKey(providerId));
  s?.removeItem(userKey(providerId));
};

export const loadUser = (providerId: string): UserClaims | null => {
  const raw = safeSession()?.getItem(userKey(providerId));
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as UserClaims;
  } catch {
    return null;
  }
};

export const saveUser = (providerId: string, user: UserClaims): void => {
  safeSession()?.setItem(userKey(providerId), JSON.stringify(user));
};

export const savePending = (providerId: string, verifier: string, state: string): void => {
  const s = safeLocal();
  s?.setItem(VERIFIER_KEY, verifier);
  s?.setItem(STATE_KEY, state);
  s?.setItem(PROVIDER_KEY, providerId);
};

export const consumePending = (): { providerId: string; verifier: string; state: string } | null => {
  const s = safeLocal();
  const verifier = s?.getItem(VERIFIER_KEY);
  const state = s?.getItem(STATE_KEY);
  const providerId = s?.getItem(PROVIDER_KEY);
  s?.removeItem(VERIFIER_KEY);
  s?.removeItem(STATE_KEY);
  s?.removeItem(PROVIDER_KEY);
  if (!verifier || !state || !providerId) {
    return null;
  }
  return { providerId, verifier, state };
};
