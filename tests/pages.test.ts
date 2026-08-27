import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

const pages = [
  'site/index.html',
  'site/privacy/index.html',
  'site/terms/index.html',
  'entrypoints/popup/index.html',
  'entrypoints/reader/index.html'
];

describe.each(pages)('%s', (path) => {
  const document = new JSDOM(readFileSync(path, 'utf8')).window.document;

  it('has the accessibility document basics', () => {
    expect(document.documentElement.lang).toBe('en');
    expect(document.title.length).toBeGreaterThan(8);
    expect(document.querySelectorAll('main')).toHaveLength(1);
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    expect(document.querySelector('a[href^="#main"]')).not.toBeNull();
  });

  it('gives every image an alt attribute', () => {
    document.querySelectorAll('img').forEach((image) => expect(image.hasAttribute('alt')).toBe(true));
  });
});

describe('privacy claims match implementation', () => {
  it('loads no remote runtime scripts, fonts, or styles', () => {
    pages.forEach((path) => {
      const source = readFileSync(path, 'utf8');
      expect(source).not.toMatch(/<(script|link)[^>]+https?:\/\//i);
      expect(source).not.toMatch(/google-analytics|gtag\(|segment\.com|mixpanel/i);
    });
  });
});
