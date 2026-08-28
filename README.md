# Transcript Study View

Transcript Study View is a free, local-first browser extension for people who absorb a talk more easily as text. It turns an official YouTube or TED transcript already available to the viewer into a calm reading page without downloading media, generating a new transcript, summarizing, or rewriting the source.

Live site: <https://transcript-study-view.sociobot.in>

## What it does

- Detects official transcript rows on supported YouTube videos and TED talks.
- Groups short caption lines into readable, timestamped paragraphs.
- Returns to the original player at every paragraph timestamp.
- Searches the transcript and supports `J` / `K` paragraph navigation.
- Saves selected text or full paragraphs in extension-local storage.
- Offers text sizing, a dyslexia-friendly spacing mode, light/dark/system themes, and browser-provided text-to-speech.
- Keeps captured transcript text in browser session storage. There are no accounts, analytics, transcript uploads, or remote AI calls.

## Browser support

The build produces Manifest V3 packages for Chromium and Firefox. YouTube and TED can change their page markup; capture fails honestly with recovery guidance when an official track is unavailable or no longer visible. English interface copy ships in v1, while transcript text remains in the source language.

## Develop

Requirements: Node.js 22+ and npm 10+.

```sh
npm ci
npm run dev          # WXT extension development
npm run dev:site     # landing site development
```

For local browser testing, load WXT’s generated `.output/chrome-mv3` directory as an unpacked extension.

## Test and build

```sh
npm test             # unit and semantic document tests
npm run typecheck
npm run lint         # ESLint for extension, site, tests, and build scripts
npm run build:site   # exact factory deployment build; outputs everything under dist/
npm run test:e2e     # Playwright + axe on desktop and 390px mobile
```

The committed Playwright version is pinned to `1.58.2`, matching the factory browser revision. On Linux, `npm run test:e2e` uses `xvfb-run` because Chromium only permits the packaged-extension smoke test in its headed browser binary.

`npm run build:site` (and its `npm run build` alias) creates:

- `dist/extension/chrome-mv3/` and `dist/extension/firefox-mv3/` unpacked builds;
- `dist/site/` as the static deployment root, with `index.html` at its root;
- installable pilot ZIPs in `dist/site/downloads/`.

After a static deployment, run `npm run verify:live`. It verifies both public downloads are current ZIP bytes with the right response type, tests each archive, and loads the public Chromium package in a fresh profile.

`dist/site/` also contains `staticwebapp.config.json`. It deliberately excludes `/downloads/*` from the static-app navigation fallback so installation links remain ZIP files, applies a restrictive CSP and Permissions-Policy, and gives fingerprinted assets, fonts, and ZIPs immutable cache lifetimes while keeping HTML short-lived.

The build also creates responsive AVIF artwork, renders extension PNG icons from the source SVG, copies only the two self-hosted Latin font subsets, and enforces the 200 KB JavaScript / 50 KB CSS budgets.

## Architecture

- WXT + TypeScript for the MV3 extension.
- Isolated and narrowly scoped MAIN-world content scripts read page-owned transcript rows/player caption data and seek the existing media player.
- `storage.session` holds captured text; `storage.local` holds highlights and preferences.
- The reader uses the platform `SpeechSynthesis` API and no external service.
- Vite builds a dependency-light static site with no runtime CDN.

The opportunity brief is in [`.factory/brief.json`](.factory/brief.json), the product-specific visual thesis and asset provenance are in [`.factory/design.md`](.factory/design.md), and completed verification is recorded in [`.factory/handoff.md`](.factory/handoff.md).

## Privacy and terms

See [`site/privacy/index.html`](site/privacy/index.html) and [`site/terms/index.html`](site/terms/index.html). The deployed routes are `/privacy/` and `/terms/`.

## License

Product code is released under the [MIT License](LICENSE). Source Serif 4 and Atkinson Hyperlegible Next are redistributed under the SIL Open Font License through their Fontsource packages. The generated Listening Garden artwork is original to this product; prompt and review provenance are recorded beside the source asset.
