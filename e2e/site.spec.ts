import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';

test('landing page is complete, stable, and accessible', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle(/Transcript Study View/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('link', { name: /Download for Chromium/ })).toHaveAttribute('href', /chromium\.zip$/);
  await expect(page.locator('.hero-scene img')).toHaveJSProperty('complete', true);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations, accessibility.violations.map((item) => `${item.id}: ${item.help}`).join('\n')).toEqual([]);
  expect(errors).toEqual([]);
});

test('legal pages expose one clear main heading and pass axe', async ({ page }) => {
  for (const path of ['/privacy/', '/terms/']) {
    await page.goto(path);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
  }
});

test('layouts have no horizontal overflow and keep installation actions usable', async ({ page }) => {
  await page.goto('/');
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  await expect(page.getByRole('link', { name: /Get the free extension/ })).toBeVisible();
  await page.getByRole('link', { name: /Get the free extension/ }).click();
  await expect(page.locator('#install')).toBeInViewport();
});

test('built installation packages are real ZIP downloads', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'One package check is sufficient.');
  const releaseResponse = await page.request.get('/release.json');
  expect(releaseResponse.ok()).toBe(true);
  const release = await releaseResponse.json() as { revision: string; packages: Record<string, string> };
  expect(release.revision).toMatch(/^[0-9a-f]{40}$/);
  for (const packageName of ['transcript-study-view-chromium.zip', 'transcript-study-view-firefox.zip']) {
    const response = await page.request.get(`/downloads/${packageName}`);
    expect(response.ok(), packageName).toBe(true);
    expect(response.headers()['content-type']).toContain('application/zip');
    const body = await response.body();
    expect(body.subarray(0, 4).toString()).toBe('PK\x03\x04');
    expect(createHash('sha256').update(body).digest('hex')).toBe(release.packages[packageName]);
  }
});
