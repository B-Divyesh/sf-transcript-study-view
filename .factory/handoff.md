# Handoff — Transcript Study View v1

## What shipped

- A WXT + TypeScript Manifest V3 extension for Chromium and Firefox.
- YouTube and TED capture limited to official timed transcript text already exposed on the active source page. YouTube supports both visible transcript rows and the official caption track held by its page player; no media fetching, scraping bypass, transcription, summary, or rewrite path exists.
- A session-local reader with readable paragraph grouping, source attribution, timestamp jump-back, search, reading progress, `J`/`K`/`/`/`Space`/`Esc` keyboard paths, browser TTS, 17–28px type controls, light/dark/system themes, and a generous-spacing Atkinson mode.
- Selection and whole-paragraph highlights stored locally per canonical source URL, including remove and Undo.
- First-class unsupported, transcript-missing, offline, stale-session, empty-transcript, missing-player, and TTS-failure guidance.
- Responsive extension UI and public landing page down to 390px, plus `/privacy/` and `/terms/`.
- Chromium and Firefox pilot ZIPs linked from `dist/site/downloads/`.
- A product-specific “Listening Garden” visual system and original generated hero artwork with retained prompt/source provenance and optimized responsive AVIF/WebP outputs.

## How to run and verify

```sh
npm install
npm test
npm run typecheck
npm run build
npm run test:e2e
```

Deploy `dist/site/`. For an unpacked browser smoke test, load `dist/extension/chrome-mv3/` from `chrome://extensions` with Developer mode enabled, open a captioned YouTube video or TED talk, select the extension, and choose **Open study view**.

## Verification completed on 2026-08-27

- `npm test`: 18/18 passing.
- `npm run typecheck`: passing.
- `npm run build`: passing from the documented command; static deployment at `dist/site/index.html`.
- `npm run test:e2e`: 5 passing, 1 intentionally skipped by project (the 390px-only assertion in the desktop project); axe-core found zero violations on landing, privacy, and terms in Chromium desktop/mobile; no console errors; 390px has no horizontal overflow.
- Packaged-extension Chromium smoke: popup loaded; seeded transcript opened as nine reading sections; one H1; search returned all nine sections; local highlight count changed to one; no console errors.
- Lighthouse mobile, local production build: Performance **100**, Accessibility **100**, Best Practices **100**, SEO **100**; FCP **0.9 s**, LCP **1.7 s**, CLS **0**, total blocking time **0 ms**.
- Production budgets: site JavaScript **0.92 KB**, CSS **12.41 KB**, self-hosted fonts **84.82 KB** total, mobile hero **44 KB AVIF / 56 KB WebP**, unpacked Chromium extension **140.67 KB**.
- `npm audit --omit=dev`: zero production vulnerabilities.

## Known gaps / next steps

- YouTube and TED markup can change. Capture intentionally fails closed; maintain the site-specific selectors against real platform changes.
- A best-effort live YouTube probe from the build container was blocked by YouTube’s “sign in to confirm you’re not a bot” interstitial before it exposed captions. The packaged bridge and seeded end-to-end reader flow were verified, but release QA should also exercise one signed-in, captioned video in a normal browser profile.
- Browser stores are not configured by this repository. The ZIPs are suitable for pilot/manual installation; signing and listing are factory release work.
- Browser voice availability and quality depend on the user’s installed voices and operating system.
- Cross-language interface localization and optional highlight export are reasonable later additions, but are outside this v1 brief.
