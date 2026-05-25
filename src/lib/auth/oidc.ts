import * as oauth from 'oauth4webapi';
import { OIDC_CLIENT_ID, OIDC_ISSUER, OIDC_SCOPES, oidcRedirectUri } from './config';
import { consumePending, savePending } from './storage';
import type { TokenSet, UserClaims } from './types';

// Cache the discovered AuthorizationServer for the tab session — discovery is
// a 1-2 second network hit and the metadata doesn't change between page loads.
let serverPromise: Promise<oauth.AuthorizationServer> | null = null;

const discover = (): Promise<oauth.AuthorizationServer> => {
  if (!serverPromise) {
    const issuerUrl = new URL(OIDC_ISSUER);
    serverPromise = oauth.discoveryRequest(issuerUrl, { algorithm: 'oidc' }).then((response) => oauth.processDiscoveryResponse(issuerUrl, response));
  }
  return serverPromise;
};

const client: oauth.Client = { client_id: OIDC_CLIENT_ID };
// PKCE public client — no secret. The verifier proves possession of the
// auth-request originator instead.
const clientAuth = oauth.None();

// Step 1 of the auth flow: redirect the browser to the IdP's authorization
// endpoint. PKCE verifier + state are stashed in sessionStorage so the
// callback handler can match them after the redirect round-trip.
export const beginSignIn = async (): Promise<void> => {
  const server = await discover();
  const verifier = oauth.generateRandomCodeVerifier();
  const challenge = await oauth.calculatePKCECodeChallenge(verifier);
  const state = oauth.generateRandomState();
  savePending(verifier, state);

  if (!server.authorization_endpoint) {
    throw new Error('OIDC discovery returned no authorization_endpoint.');
  }
  const url = new URL(server.authorization_endpoint);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', OIDC_CLIENT_ID);
  url.searchParams.set('redirect_uri', oidcRedirectUri());
  url.searchParams.set('scope', OIDC_SCOPES);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');

  window.location.assign(url.toString());
};

// Decode an unverified JWT for display purposes. We don't trust these claims
// for authorization — they're just shown in the Header user chip. Real
// verification happens inside oauth4webapi against the IdP's JWKS.
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
  tokens: TokenSet;
  user: UserClaims | null;
}

// Dedupe completion attempts keyed on (code, state). React StrictMode double-mounts
// effects in dev, which would otherwise cause the second mount to see an empty PKCE
// state (consumed by the first) and throw. Both mounts share the same Promise.
const inFlight = new Map<string, Promise<CallbackResult>>();

// Step 2: handle the /auth/callback redirect. Validates state (CSRF),
// exchanges code+verifier for tokens, decodes the id_token for display.
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

  const server = await discover();
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
  return { tokens, user };
};
