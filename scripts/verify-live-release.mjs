import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const siteUrl = process.env.SITE_URL ?? 'https://transcript-study-view.sociobot.in';
const packages = [
  'transcript-study-view-chromium.zip',
  'transcript-study-view-firefox.zip'
];
const temporaryRoot = await mkdtemp(join(tmpdir(), 'transcript-study-view-live-'));
const expectedRevision = process.env.EXPECTED_REVISION;

function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function fetchPackage(packageName, expectedHash) {
  const response = await fetch(`${siteUrl}/downloads/${packageName}`, { redirect: 'error' });
  if (!response.ok) throw new Error(`${packageName}: expected HTTP 200, got ${response.status}`);
  if (!response.headers.get('content-type')?.includes('application/zip')) {
    throw new Error(`${packageName}: expected application/zip, got ${response.headers.get('content-type') ?? 'no Content-Type'}`);
  }
  const received = Buffer.from(await response.arrayBuffer());
  if (!received.subarray(0, 4).equals(Buffer.from('PK\x03\x04'))) throw new Error(`${packageName}: response is not a ZIP file`);
  if (digest(received) !== expectedHash) throw new Error(`${packageName}: live SHA-256 does not match its deployed release manifest`);
  const output = join(temporaryRoot, packageName);
  await writeFile(output, received);
  execFileSync('unzip', ['-t', output], { stdio: 'inherit' });
  return output;
}

try {
  const releaseResponse = await fetch(`${siteUrl}/release.json`, { redirect: 'error' });
  if (!releaseResponse.ok) throw new Error(`release.json: expected HTTP 200, got ${releaseResponse.status}`);
  const release = await releaseResponse.json();
  if (typeof release.revision !== 'string' || !release.packages || typeof release.packages !== 'object') {
    throw new Error('release.json: expected a revision and package checksum map');
  }
  if (expectedRevision && release.revision !== expectedRevision) {
    throw new Error(`release.json: expected revision ${expectedRevision}, got ${release.revision}`);
  }
  const chromiumZip = await fetchPackage(packages[0], release.packages[packages[0]]);
  await fetchPackage(packages[1], release.packages[packages[1]]);

  const unpacked = join(temporaryRoot, 'chromium');
  execFileSync('unzip', ['-q', chromiumZip, '-d', unpacked]);
  const profile = join(temporaryRoot, 'profile');
  const context = await chromium.launchPersistentContext(profile, {
    headless: false,
    args: [`--disable-extensions-except=${unpacked}`, `--load-extension=${unpacked}`]
  });
  try {
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
    const manifest = await worker.evaluate(() => chrome.runtime.getManifest());
    if (manifest.name !== 'Transcript Study View') throw new Error(`Unexpected public package manifest: ${manifest.name}`);
  } finally {
    await context.close();
  }

  console.log(`Live release verified: ${siteUrl} revision ${release.revision} serves both checksum-matched ZIP packages and the Chromium package loads in a fresh profile.`);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
