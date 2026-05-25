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

type AuthStatus = 'unauthenticated' | 'signing-in' | 'authenticated' | 'error';

export interface AuthState {
  status: AuthStatus;
  tokens: TokenSet | null;
  user: UserClaims | null;
  error?: string;
}
