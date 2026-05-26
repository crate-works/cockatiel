export interface TokenSet {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresAt: number; // epoch ms
  tokenType: string;
}

export interface UserClaims {
  sub: string;
  name?: string;
  email?: string;
  givenName?: string;
  familyName?: string;
}

export interface ProviderSession {
  tokens: TokenSet;
  user: UserClaims | null;
}
