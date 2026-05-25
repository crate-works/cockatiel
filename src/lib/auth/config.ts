// OIDC client config for Cockatiel. The PARADISEC catalog admin app at
// admin-catalog.paradisec.org.au is the OpenID Connect provider.

export const OIDC_ISSUER = 'https://admin-catalog.paradisec.org.au';

export const OIDC_CLIENT_ID = '9cYKX8nNk4bO_hyp2aanNYO-b5mC1pm2yVltT1zfdDc';

// Redirect URI must exactly match what's registered with the IdP. Computed at
// runtime so localhost dev and production deploys both work without rebuilds.
export const oidcRedirectUri = (): string => `${window.location.origin}/auth/callback`;

// `openid` is mandatory for OIDC; `profile email` gets us name + email claims
// for the Header user chip. `public` is required by PARADISEC's Doorkeeper-backed
// API for read access to catalog entities (anonymous-tier records).
export const OIDC_SCOPES = 'openid profile email public';
