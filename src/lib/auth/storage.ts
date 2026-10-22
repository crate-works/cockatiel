import type { TokenSet, UserClaims } from './types';

// Tokens live in localStorage so a sign-in is shared across tabs. PKCE state
// can't use sessionStorage either: Vite serves with COOP:same-origin (required
// for SharedArrayBuffer / VAD), which can sever the browsing context across the
// cross-origin OAuth round-trip and drop sessionStorage on the way back.

export const AUTH_KEY_PREFIX = 'cockatiel:auth:';

const tokenKey = (providerId: string) => `${AUTH_KEY_PREFIX}tokens:${providerId}`;
const userKey = (providerId: string) => `${AUTH_KEY_PREFIX}user:${providerId}`;

const VERIFIER_KEY = 'cockatiel:auth:pkce-verifier';
const STATE_KEY = 'cockatiel:auth:pkce-state';
const PROVIDER_KEY = 'cockatiel:auth:pkce-provider';
const RETURN_KEY = 'cockatiel:auth:pkce-return-to';

const safeLocal = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

export const loadTokens = (providerId: string): TokenSet | null => {
  const raw = safeLocal()?.getItem(tokenKey(providerId));
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
  safeLocal()?.setItem(tokenKey(providerId), JSON.stringify(tokens));
};

export const clearTokens = (providerId: string): void => {
  const s = safeLocal();
  s?.removeItem(tokenKey(providerId));
  s?.removeItem(userKey(providerId));
};

export const loadUser = (providerId: string): UserClaims | null => {
  const raw = safeLocal()?.getItem(userKey(providerId));
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
  safeLocal()?.setItem(userKey(providerId), JSON.stringify(user));
};

export const savePending = (providerId: string, verifier: string, state: string, returnTo: string): void => {
  const s = safeLocal();
  s?.setItem(VERIFIER_KEY, verifier);
  s?.setItem(STATE_KEY, state);
  s?.setItem(PROVIDER_KEY, providerId);
  s?.setItem(RETURN_KEY, returnTo);
};

export const consumePending = (): { providerId: string; verifier: string; state: string; returnTo: string | null } | null => {
  const s = safeLocal();
  const verifier = s?.getItem(VERIFIER_KEY);
  const state = s?.getItem(STATE_KEY);
  const providerId = s?.getItem(PROVIDER_KEY);
  const returnTo = s?.getItem(RETURN_KEY) ?? null;
  s?.removeItem(VERIFIER_KEY);
  s?.removeItem(STATE_KEY);
  s?.removeItem(PROVIDER_KEY);
  s?.removeItem(RETURN_KEY);
  if (!verifier || !state || !providerId) {
    return null;
  }
  return { providerId, verifier, state, returnTo };
};
