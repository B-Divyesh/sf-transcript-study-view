import { mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { chromium, expect, test } from '@playwright/test';

const extensionPath = resolve('dist/extension/chrome-mv3');

test('packaged reader isolates loading/stale states and keeps mobile keyboard study controls usable', async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'The packaged extension state test runs once.');
  test.setTimeout(60_000);
  expect(existsSync(extensionPath), 'npm run build must produce the packaged Chromium extension').toBe(true);

  const profile = await mkdtemp(resolve(tmpdir(), 'transcript-study-view-reader-'));
  const context = await chromium.launchPersistentContext(profile, {
    // Chromium only enables sideloaded extensions in its headed browser binary.
    // `npm run test:e2e` supplies an ephemeral Xvfb display in CI/Linux.
    headless: false,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`]
  });

  try {
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
    const extensionId = new URL(worker.url()).host;

    const loadingPage = await context.newPage();
    await loadingPage.addInitScript(() => {
      const session = chrome.storage.session;
      session.get = () => new Promise(() => undefined);
    });
    await loadingPage.goto(`chrome-extension://${extensionId}/reader.html?session=waiting`);
    await expect(loadingPage.locator('#loading')).toBeVisible();
    await expect(loadingPage.locator('#error-state')).toBeHidden();
    await expect(loadingPage.locator('#reader-shell')).toBeHidden();

    const stalePage = await context.newPage();
    await stalePage.goto(`chrome-extension://${extensionId}/reader.html?session=expired`);
    await expect(stalePage.locator('#loading')).toBeHidden();
    await expect(stalePage.locator('#error-state')).toBeVisible();
    await expect(stalePage.locator('#reader-shell')).toBeHidden();
    await expect(stalePage.getByRole('heading', { name: 'This study session has ended.' })).toBeVisible();

    await worker.evaluate(async () => {
      await chrome.storage.session.set({
        'session:keyboard-check': {
          title: 'Keyboard reader check',
          sourceUrl: 'https://www.youtube.com/watch?v=keyboard-check',
          sourceTabId: 1,
          site: 'YouTube',
          segments: [
            { start: 0, text: 'First shaped sentence has a phrase.' },
            { start: 20, text: 'Second paragraph takes another route.' },
            { start: 50, text: 'Third line closes the transcript.' }
          ]
        }
      });
      await chrome.storage.local.set({
        'highlights:https://www.youtube.com/watch?v=keyboard-check': [{
          id: 'saved-mobile-highlight',
          paragraphId: 'p-0',
          start: 0,
          text: 'First shaped sentence has a phrase.',
          sourceUrl: 'https://www.youtube.com/watch?v=keyboard-check',
          createdAt: 0
        }]
      });
    });
    const readerPage = await context.newPage();
    await readerPage.setViewportSize({ width: 390, height: 844 });
    await readerPage.goto(`chrome-extension://${extensionId}/reader.html?session=keyboard-check`);
    await expect(readerPage.locator('#reader-shell')).toBeVisible();
    await expect(readerPage.getByRole('link', { name: 'Transcript Study View home' })).toBeVisible();
    const accessibility = await new AxeBuilder({ page: readerPage }).analyze();
    expect(accessibility.violations, accessibility.violations.map((item) => `${item.id}: ${item.help}`).join('\n')).toEqual([]);
    for (const control of [readerPage.locator('.highlight-jump'), readerPage.locator('.highlight-remove')]) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await readerPage.keyboard.press('/');
    await readerPage.keyboard.type('another route');
    await expect(readerPage.locator('#search-status')).toHaveText('1 paragraph found');
    await readerPage.locator('#reader-title').focus();
    await readerPage.keyboard.press('j');
    await expect(readerPage.locator('.paragraph.is-current')).toHaveCount(1);
    const width = await readerPage.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    expect(width.content).toBeLessThanOrEqual(width.viewport);
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});
