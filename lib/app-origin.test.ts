import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAppOrigin, appAbsoluteUrl } from './app-origin';

describe('app-origin', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  describe('getAppOrigin', () => {
    it('should throw an error in production if NEXT_PUBLIC_APP_URL is missing', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('NEXT_PUBLIC_APP_URL', '');

      expect(() => getAppOrigin()).toThrow(/NEXT_PUBLIC_APP_URL is required in production/);
    });

    it('should throw an error in production if NEXT_PUBLIC_APP_URL is only whitespace', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('NEXT_PUBLIC_APP_URL', '   ');

      expect(() => getAppOrigin()).toThrow(/NEXT_PUBLIC_APP_URL is required in production/);
    });

    it('should return normalized URL in production if NEXT_PUBLIC_APP_URL is provided', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('NEXT_PUBLIC_APP_URL', '  https://app.valgate.com/  ');

      expect(getAppOrigin()).toBe('https://app.valgate.com');
    });

    it('should remove multiple trailing slashes', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.valgate.com///');

      expect(getAppOrigin()).toBe('https://app.valgate.com');
    });

    it('should return localhost fallback in non-production if NEXT_PUBLIC_APP_URL is missing', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('NEXT_PUBLIC_APP_URL', '');

      expect(getAppOrigin()).toBe('http://localhost:3001');
    });

    it('should return normalized URL in non-production if NEXT_PUBLIC_APP_URL is provided', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('NEXT_PUBLIC_APP_URL', '  http://localhost:3001/  ');

      expect(getAppOrigin()).toBe('http://localhost:3001');
    });
  });

  describe('appAbsoluteUrl', () => {
    it('should correctly join origin and path with leading slash', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.valgate.com');

      expect(appAbsoluteUrl('/test')).toBe('https://app.valgate.com/test');
    });

    it('should correctly join origin and path without leading slash', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.valgate.com');

      expect(appAbsoluteUrl('test')).toBe('https://app.valgate.com/test');
    });
  });
});
