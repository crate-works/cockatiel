import { describe, expect, it } from 'vitest';
import { AUTH_CALLBACK_PATH, isAuthCallbackPath } from '@/lib/auth/oidc';

// In tests `import.meta.env.BASE_URL` is `/`, so the callback path is /auth/callback.
describe('isAuthCallbackPath', () => {
  it('matches the exact callback path', () => {
    expect(isAuthCallbackPath(AUTH_CALLBACK_PATH)).toBe(true);
    expect(isAuthCallbackPath('/auth/callback')).toBe(true);
  });

  it('matches the trailing-slash form GitHub Pages / nginx redirect to', () => {
    expect(isAuthCallbackPath('/auth/callback/')).toBe(true);
  });

  it('does not match other paths', () => {
    expect(isAuthCallbackPath('/')).toBe(false);
    expect(isAuthCallbackPath('/auth')).toBe(false);
    expect(isAuthCallbackPath('/auth/callbackx')).toBe(false);
    expect(isAuthCallbackPath('/auth/callback/extra')).toBe(false);
  });
});
