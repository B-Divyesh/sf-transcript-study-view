import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import sharp from 'sharp';

const root = new URL('..', import.meta.url).pathname;
process.chdir(root);

await rm('dist', { recursive: true, force: true });
await rm('.output', { recursive: true, force: true });

const fontFiles = [
  ['node_modules/@fontsource-variable/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-wght-normal.woff2', 'atkinson-latin.woff2'],
  ['node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2', 'source-serif-latin.woff2']
];
for (const base of ['public/fonts', 'site/public/fonts']) {
  await mkdir(base, { recursive: true });
  for (const [from, name] of fontFiles) await cp(from, join(base, name));
}

await mkdir('public/icon', { recursive: true });
for (const size of [16, 32, 48, 128]) {
  await sharp('assets/icon.svg').resize(size, size).png().toFile(`public/icon/${size}.png`);
}

await sharp('assets/src/listening-garden.png').resize(960, 640).avif({ quality: 52 }).toFile('site/public/assets/listening-garden-960.avif');
await sharp('assets/src/listening-garden.png').resize(1536, 1024).avif({ quality: 55 }).toFile('site/public/assets/listening-garden-1536.avif');

execFileSync('npx', ['wxt', 'build'], { stdio: 'inherit' });
execFileSync('npx', ['wxt', 'zip'], { stdio: 'inherit' });
execFileSync('npx', ['wxt', 'build', '-b', 'firefox'], { stdio: 'inherit' });
execFileSync('npx', ['wxt', 'zip', '-b', 'firefox'], { stdio: 'inherit' });
execFileSync('npx', ['vite', 'build', '--config', 'vite.site.config.ts'], { stdio: 'inherit' });

await mkdir('dist/extension', { recursive: true });
await cp('.output/chrome-mv3', 'dist/extension/chrome-mv3', { recursive: true });
await cp('.output/firefox-mv3', 'dist/extension/firefox-mv3', { recursive: true }).catch(() => undefined);
await mkdir('dist/site/downloads', { recursive: true });

const outputFiles = await readdir('.output');
for (const name of outputFiles) {
  if (!name.endsWith('.zip') || name.endsWith('-sources.zip')) continue;
  const destination = name.includes('firefox') ? 'transcript-study-view-firefox.zip' : 'transcript-study-view-chromium.zip';
  await cp(join('.output', name), join('dist/site/downloads', destination));
}

const budgets = [
  ['dist/site', 200 * 1024, /\.js$/],
  ['dist/site', 50 * 1024, /\.css$/]
];
for (const [dir, limit, pattern] of budgets) {
  const assets = await readdir(join(dir, 'assets')).catch(() => []);
  for (const asset of assets) {
    if (!pattern.test(asset)) continue;
    const info = await stat(join(dir, 'assets', asset));
    if (info.size > limit) throw new Error(`${asset} exceeds the ${limit / 1024} KB budget`);
  }
}

console.log('Build complete: extension packages and static site are in dist/.');
