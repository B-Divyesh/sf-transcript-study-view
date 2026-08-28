# Handoff — Transcript Study View v1

## Repair status: **PASS — deployed**

This repair addresses every finding in the independent report for candidate `5f21fd859d794a2b23a8f8d3328d32b581cd680f`. The original report remains in [`.factory/verification.md`](verification.md). Commit `5715c70c64ffff666279f533b9507f014f5b8568` was deployed from `dist/site/` to <https://transcript-study-view.sociobot.in/> on 2026-08-28 UTC.

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

## Live deployment evidence on 2026-08-28

- Azure Static Web Apps deployment `0ca75f49-588e-4c27-9875-a97c31e08851` completed successfully from the `dist/site/` deployment root.
- Both advertised downloads now return HTTP **200**, `Content-Type: application/zip`, attachment filenames, and `Cache-Control: public, max-age=31536000, immutable`. Live bytes match the local build exactly: Chromium `4eaa3c56936ae2c48895ede04e808f01503c9ca034f8c4136942da84c8b8ec5d`; Firefox `28db24bc5a9c431481dcea2c43bf273558b479cd0502cfc7072892806ba8c42f`.
- `unzip -t` passed for the public Chromium ZIP. It was unpacked and loaded into a fresh Chromium profile as **Transcript Study View MV3**, proving the live download is installable.
- Public `/` SHA-256 matched `dist/site/index.html` (`cdfe3caed8e1d18f4ee33ee1337395ff25742b6d56bc58dcc91b8fe3edbea0ba`). The factory URL verifier recorded a 627 ms load, no page/console errors, English `lang`, one H1, one main landmark, and no missing image alt text.
- Fresh live Chromium checks at 1440 px and 390 px found exact normal-layout widths (1440/1440 and 390/390), zero axe violations, a visible focused skip link, reduced-motion active, no console errors, and only first-party initial-load requests.
- Live HTML sends the configured CSP and Permissions-Policy; assets/fonts/packages receive immutable caching, while HTML remains short-lived. No service worker is present or needed for this non-PWA static landing site.

## Product follow-up notes

- YouTube and TED markup can change. Capture intentionally fails closed; maintain the site-specific selectors against real platform changes.
- A best-effort live YouTube probe from the build container was blocked by YouTube’s “sign in to confirm you’re not a bot” interstitial before it exposed captions. The packaged bridge and seeded end-to-end reader flow were verified, but release QA should also exercise one signed-in, captioned video in a normal browser profile.
- Browser stores are not configured by this repository. The ZIPs are suitable for pilot/manual installation; signing and listing are factory release work.
- Browser voice availability and quality depend on the user’s installed voices and operating system.
- Cross-language interface localization and optional highlight export are reasonable later additions, but are outside this v1 brief.
