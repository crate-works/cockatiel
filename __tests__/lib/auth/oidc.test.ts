import { describe, expect, it } from 'vitest';
import { AUTH_CALLBACK_PATH, safeReturnTo } from '@/lib/auth/oidc';

// In tests `import.meta.env.BASE_URL` is `/`, so the callback path is /auth/callback.
describe('AUTH_CALLBACK_PATH', () => {
  it('is the base-aware callback path', () => {
    expect(AUTH_CALLBACK_PATH).toBe('/auth/callback');
  });
});

describe('safeReturnTo', () => {
  it('accepts router-relative in-app paths', () => {
    expect(safeReturnTo('/catalog')).toBe('/catalog');
    expect(safeReturnTo('/catalog?q=hello&page=2')).toBe('/catalog?q=hello&page=2');
    expect(safeReturnTo('/session/abc123')).toBe('/session/abc123');
  });

  it('falls back to root for absent or empty values', () => {
    expect(safeReturnTo(null)).toBe('/');
    expect(safeReturnTo(undefined)).toBe('/');
    expect(safeReturnTo('')).toBe('/');
  });

  it('rejects open-redirect attempts', () => {
    expect(safeReturnTo('https://evil.example/phish')).toBe('/');
    expect(safeReturnTo('//evil.example')).toBe('/');
    expect(safeReturnTo('/\\evil.example')).toBe('/');
    expect(safeReturnTo('javascript:alert(1)')).toBe('/');
    expect(safeReturnTo('catalog')).toBe('/');
  });
});
