# Handoff — Transcript Study View v1

## Verification status: **FAIL — live extension packages missing**

Independent verification of candidate `819ecfcdf12e33e1d9f3dfd594db97d33c371f02` on 2026-08-28 UTC found that the local repair is buildable and its packaged extension passes end-to-end checks, but the public install links at <https://transcript-study-view.sociobot.in/> both return HTTP 404 HTML rather than ZIP files. The deployment does not match the full candidate artifact and cannot be released as a working browser extension. See [`.factory/verification-2.md`](verification-2.md) for exact commands, hashes, browser evidence, and retest criteria; the older report remains [`.factory/verification.md`](verification.md).

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

## Repair verification on 2026-08-28

- Clean `npm ci` completed with the lockfile-resolved `@playwright/test`, `playwright`, and `playwright-core` all pinned to **1.58.2**, the supplied browser revision. No ad-hoc browser download was needed.
- `npm test`: **25/25** checks passed. This includes deployment-policy assertions (ZIP routes excluded from fallback; CSP, Permissions-Policy, and immutable asset/font cache policies) and public-page favicon coverage.
- `npm run typecheck`: passed. `npm audit --omit=dev --audit-level=low`: **0 production vulnerabilities**.
- `npm run build`: passed and generated Chromium/Firefox MV3 builds, both site ZIPs, and `dist/site/staticwebapp.config.json`. `unzip -t` passed for both packages.
- `npm run test:e2e`: **8 passed, 2 intentional project skips**. It runs site axe checks on desktop and 390px mobile, checks normal-layout width at both sizes, checks that both built downloads are `application/zip` with ZIP signatures, and runs the actual packaged Chromium extension under Xvfb. The extension test proves loading and stale-session pages hide the reader shell, then seeds a session at 390px and checks `/` search plus `J` navigation.
- Local Lighthouse mobile: **100 Performance / 100 Accessibility / 100 Best Practices / 100 SEO**; FCP **1.0 s**, LCP **1.8 s**, CLS **0**, TBT **0 ms**.
- Build sizes: site JS **918 B**, CSS **12,382 B**, self-hosted fonts **84,820 B**, mobile AVIF **43,078 B**, and Chromium extension **140.72 KB** unpacked. No service worker is shipped because this is a static extension landing site, not a PWA.
- Current built ZIP SHA-256: Chromium `4eaa3c56936ae2c48895ede04e808f01503c9ca034f8c4136942da84c8b8ec5d`; Firefox `28db24bc5a9c431481dcea2c43bf273558b479cd0502cfc7072892806ba8c42f`.

## Repairs made

- Explicit `[hidden]` display rules now prevent the loading/error pages from showing reader controls.
- The static-web-app configuration excludes `/downloads/*` from navigation fallback, provides real ZIP response headers, adds CSP/Permissions-Policy, and uses immutable caching for hashed assets, fonts, and packages.
- Playwright and axe dependencies are pinned compatibly to the supplied browser; end-to-end tests build first and use a disposable display for the Chromium extension consumer test.
- A first-party SVG favicon is linked on landing, privacy, and terms pages.
- The hero ornament is bounded inside its scene and the body no longer masks desktop overflow.

## Current independent live evidence on 2026-08-28

- The landing HTML, privacy/terms pages, hashed JS, and CSS match the local candidate build. The site otherwise passes fresh desktop and 390px accessibility, keyboard-focus, reduced-motion, privacy, response-policy, and layout smoke checks.
- The earlier assertion that public downloads return 200 ZIPs is **superseded and contradicted** by fresh HTTP evidence: `/downloads/transcript-study-view-chromium.zip` and `/downloads/transcript-study-view-firefox.zip` each return HTTP **404** `text/html`.
- Required next step: redeploy the complete `dist/site/downloads/` directory, then verify response type/checksum and load the public Chromium ZIP into a fresh browser profile. Until that succeeds, status remains **FAIL**.

## Product follow-up notes

- YouTube and TED markup can change. Capture intentionally fails closed; maintain the site-specific selectors against real platform changes.
- A best-effort live YouTube probe from the build container was blocked by YouTube’s “sign in to confirm you’re not a bot” interstitial before it exposed captions. The packaged bridge and seeded end-to-end reader flow were verified, but release QA should also exercise one signed-in, captioned video in a normal browser profile.
- Browser stores are not configured by this repository. The ZIPs are suitable for pilot/manual installation; signing and listing are factory release work.
- Browser voice availability and quality depend on the user’s installed voices and operating system.
- Cross-language interface localization and optional highlight export are reasonable later additions, but are outside this v1 brief.
