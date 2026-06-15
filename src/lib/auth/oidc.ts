import * as oauth from 'oauth4webapi';
// Direct paths — same circular-init avoidance as ./store.
import { getProvider } from '@/lib/arocapi/providers';
import type { Provider } from '@/lib/arocapi/types';
import { consumePending, savePending } from './storage';
import type { TokenSet, UserClaims } from './types';

// Vite serves prod from a sub-path (e.g. `/app/` on GitHub Pages) but dev from
// `/`. `import.meta.env.BASE_URL` resolves both at build time without an env var.
// The redirect URI we send to the IdP must honour it; the router (basepath) owns
// in-app routing, so we no longer detect the callback path by hand.
const baseUrl = import.meta.env.BASE_URL;
export const AUTH_CALLBACK_PATH = `${baseUrl.replace(/\/$/, '')}/auth/callback`;

const oidcRedirectUri = (): string => `${window.location.origin}${AUTH_CALLBACK_PATH}`;

// Where to send the user back to after sign-in, as a router-relative path
// (basepath stripped — the router re-applies it on navigate). Validate it as a
// single-slash relative path before trusting it: trusting an absolute or
// protocol-relative URL here would be an open-redirect in the OAuth flow. Falls
// back to the app root when absent or suspicious.
export const safeReturnTo = (raw: string | null | undefined): string => {
  if (!raw?.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return '/';
  }
  return raw;
};

// The in-app URL to return to after sign-in: current path + query, with the
// basepath stripped to its router-relative form.
const currentReturnTo = (): string => {
  const { pathname, search } = window.location;
  const rel = pathname.startsWith(baseUrl) ? `/${pathname.slice(baseUrl.length)}` : pathname;
  return `${rel}${search}`;
};

// Cache discovered AuthorizationServer per issuer (each Provider may target a
// different IdP).
const serverPromises = new Map<string, Promise<oauth.AuthorizationServer>>();

const discover = (issuer: string): Promise<oauth.AuthorizationServer> => {
  let promise = serverPromises.get(issuer);
  if (!promise) {
    const issuerUrl = new URL(issuer);
    promise = oauth.discoveryRequest(issuerUrl, { algorithm: 'oidc' }).then((response) => oauth.processDiscoveryResponse(issuerUrl, response));
    serverPromises.set(issuer, promise);
  }
  return promise;
};

const requireOidc = (provider: Provider) => {
  if (!provider.oidc) {
    throw new Error(`Provider "${provider.id}" has no OIDC configuration.`);
  }
  return provider.oidc;
};

// PKCE public client — no secret. The verifier proves possession.
const clientAuth = oauth.None();

// Step 1: redirect the browser to the IdP's authorization endpoint.
// PKCE verifier + state + providerId stashed so the callback can match.
export const beginSignIn = async (providerId: string): Promise<void> => {
  const provider = getProvider(providerId);
  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`);
  }
  const oidc = requireOidc(provider);
  const server = await discover(oidc.issuer);

  const verifier = oauth.generateRandomCodeVerifier();
  const challenge = await oauth.calculatePKCECodeChallenge(verifier);
  const state = oauth.generateRandomState();
  // Stash where to return to so the callback can restore the catalog/session URL
  // the user signed in from. Rides the same localStorage record as the PKCE
  // state, which is proven to survive the cross-origin OAuth round-trip.
  savePending(providerId, verifier, state, currentReturnTo());

  if (!server.authorization_endpoint) {
    throw new Error('OIDC discovery returned no authorization_endpoint.');
  }
  const url = new URL(server.authorization_endpoint);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', oidc.clientId);
  url.searchParams.set('redirect_uri', oidcRedirectUri());
  url.searchParams.set('scope', oidc.scopes);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');

  window.location.assign(url.toString());
};

// Decode an unverified JWT for display. We don't trust these claims for
// authorization — they're shown in the user chip. Real verification happens
// inside oauth4webapi against the IdP's JWKS.
const decodeIdTokenClaims = (idToken: string): UserClaims | null => {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    const padded = parts[1] + '==='.slice((parts[1].length + 3) % 4);
    const json = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(json) as Record<string, unknown>;
    if (typeof claims.sub !== 'string') {
      return null;
    }
    return {
      sub: claims.sub,
      ...(typeof claims.name === 'string' ? { name: claims.name } : {}),
      ...(typeof claims.email === 'string' ? { email: claims.email } : {}),
      ...(typeof claims.given_name === 'string' ? { givenName: claims.given_name } : {}),
      ...(typeof claims.family_name === 'string' ? { familyName: claims.family_name } : {}),
    };
  } catch {
    return null;
  }
};

export interface CallbackResult {
  providerId: string;
  tokens: TokenSet;
  user: UserClaims | null;
  // Validated router-relative path to return to after sign-in.
  returnTo: string;
}

// Dedupe completion attempts (React StrictMode double-mounts effects in dev).
const inFlight = new Map<string, Promise<CallbackResult>>();

export const completeSignIn = (callbackUrl: URL): Promise<CallbackResult> => {
  const code = callbackUrl.searchParams.get('code') ?? '';
  const state = callbackUrl.searchParams.get('state') ?? '';
  const key = `${code}|${state}`;
  let promise = inFlight.get(key);
  if (!promise) {
    promise = doCompleteSignIn(callbackUrl);
    inFlight.set(key, promise);
  }
  return promise;
};

const doCompleteSignIn = async (callbackUrl: URL): Promise<CallbackResult> => {
  const pending = consumePending();
  if (!pending) {
    throw new Error('Missing PKCE state — sign-in flow was not initiated from this tab.');
  }
  const provider = getProvider(pending.providerId);
  if (!provider) {
    throw new Error(`Unknown provider stored in PKCE state: ${pending.providerId}`);
  }
  const oidc = requireOidc(provider);
  const server = await discover(oidc.issuer);

  const client: oauth.Client = { client_id: oidc.clientId };
  const params = oauth.validateAuthResponse(server, client, callbackUrl, pending.state);
  const response = await oauth.authorizationCodeGrantRequest(server, client, clientAuth, params, oidcRedirectUri(), pending.verifier);
  const result = await oauth.processAuthorizationCodeResponse(server, client, response);

  const expiresAt = Date.now() + (typeof result.expires_in === 'number' ? result.expires_in * 1000 : 3600 * 1000);
  const tokens: TokenSet = {
    accessToken: result.access_token,
    expiresAt,
    tokenType: result.token_type,
    ...(typeof result.id_token === 'string' ? { idToken: result.id_token } : {}),
    ...(typeof result.refresh_token === 'string' ? { refreshToken: result.refresh_token } : {}),
  };
  const user = tokens.idToken ? decodeIdTokenClaims(tokens.idToken) : null;
  return { providerId: pending.providerId, tokens, user, returnTo: safeReturnTo(pending.returnTo) };
};
