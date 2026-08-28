import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const packageManifest = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };

const config = JSON.parse(readFileSync('site/public/staticwebapp.config.json', 'utf8')) as {
  globalHeaders: Record<string, string>;
  navigationFallback: { exclude: string[] };
  routes: Array<{ route: string; headers: Record<string, string> }>;
};

describe('static deployment contract', () => {
  it('builds installable packages as part of the deployment build command', () => {
    expect(packageManifest.scripts['build:site']).toBe('node scripts/build.mjs');
  });

  it('keeps installable packages out of the SPA fallback', () => {
    expect(config.navigationFallback.exclude).toContain('/downloads/*');
    for (const packageName of ['transcript-study-view-chromium.zip', 'transcript-study-view-firefox.zip']) {
      const route = config.routes.find((item) => item.route === `/downloads/${packageName}`);
      expect(route?.headers['Content-Type']).toBe('application/zip');
      expect(route?.headers['Content-Disposition']).toContain(packageName);
    }
  });

  it('sets a restrictive policy and immutable caching where static assets are fingerprinted', () => {
    expect(config.globalHeaders['Content-Security-Policy']).toContain("default-src 'self'");
    expect(config.globalHeaders['Permissions-Policy']).toContain('camera=()');
    expect(config.routes.find((item) => item.route === '/assets/*')?.headers['Cache-Control']).toContain('immutable');
    expect(config.routes.find((item) => item.route === '/fonts/*')?.headers['Cache-Control']).toContain('immutable');
  });
});
