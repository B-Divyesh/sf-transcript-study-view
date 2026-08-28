# Handoff — Transcript Study View v1

## Independent verification status: **FAIL**

Candidate `5f21fd859d794a2b23a8f8d3328d32b581cd680f` was independently verified on 2026-08-28 UTC against https://transcript-study-view.sociobot.in/. The local production build and extension checks passed, but the deployed installation links are broken: both Chromium and Firefox ZIP URLs return the home page as HTML. The candidate must not be accepted or released until those packages are deployed and the reader error/loading shell is fixed. Full evidence and all findings are in [`.factory/verification.md`](verification.md).

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

## Independent verification completed on 2026-08-28

- `npm ci`, `npm test` (18/18), `npm run typecheck`, `npm run build`, and `npm audit --omit=dev` passed.
- `npm run test:e2e` passed 5 tests with 1 intentional skip only after installing the browser expected by lockfile-resolved Playwright 1.62.1; a fresh invocation initially failed because the supplied browser revision did not match.
- Packaged Chromium extension: official YouTube JSON3 caption-track bridge, capture, timestamp seek, missing-transcript recovery, TED DOM capture, mobile reader search/highlight/type/theme/focus paths, and axe were exercised. No severe/critical axe findings.
- Live pages were byte-identical to the local build for HTML, JS, CSS, and sampled imagery; automatic initial-load requests stayed first-party and used no analytics/CDNs.
- **Release blockers:** both live `/downloads/*.zip` links return 8,261-byte `text/html` landing-page fallbacks instead of the built ZIPs; reader stale-session/loading shell remains visible despite `hidden`.
- Additional findings: live favicon 404 console error; no live CSP/Permissions-Policy; static assets cache for only 30 seconds; masked 34 px desktop document overflow.

## Required next steps before acceptance

- Deploy actual Chromium and Firefox ZIPs to the linked `/downloads/` routes; verify `application/zip`, checksum, unpacking, and installation from the public URLs.
- Fix hidden reader state rendering and add coverage for loading/stale-session visual behavior.
- Pin/configure Playwright and its browser so fresh `npm ci && npm run test:e2e` works without an ad-hoc browser download.
- Add a favicon, suitable CSP/Permissions-Policy, immutable caching for hashed assets, and constrain the desktop hero decoration.

## Product follow-up notes

- YouTube and TED markup can change. Capture intentionally fails closed; maintain the site-specific selectors against real platform changes.
- A best-effort live YouTube probe from the build container was blocked by YouTube’s “sign in to confirm you’re not a bot” interstitial before it exposed captions. The packaged bridge and seeded end-to-end reader flow were verified, but release QA should also exercise one signed-in, captioned video in a normal browser profile.
- Browser stores are not configured by this repository. The ZIPs are suitable for pilot/manual installation; signing and listing are factory release work.
- Browser voice availability and quality depend on the user’s installed voices and operating system.
- Cross-language interface localization and optional highlight export are reasonable later additions, but are outside this v1 brief.
