# Handoff — Transcript Study View v1 repair 2

## Release status: **PASS — live install flow repaired**

This repair resolves the P1 release blocker documented in [`.factory/verification-2.md`](verification-2.md) for candidate `819ecfcdf12e33e1d9f3dfd594db97d33c371f02`: the landing page linked to extension archives that were absent from the deployed artifact. The repaired product revision is `85eabfdcb3f753fb2717d2bae817a22a4dce66cb` (`test: verify deployed package release identity`), deployed to <https://transcript-study-view.sociobot.in/> on 2026-08-28 UTC through Azure Static Web Apps deployment `ba1e85ba-8d2a-4a44-9f61-a7390b3f5902`.

## Root cause and repair

- The factory deployment work order runs `npm ci && npm test && npm run build:site`. Previously `build:site` invoked only Vite, while the ZIP creation lived only in `npm run build`; therefore a clean deployment had no `dist/site/downloads/` archives.
- `build:site` now invokes the complete `scripts/build.mjs` artifact build (and `build` is its alias), so it creates both MV3 builds, copies both install ZIPs into `dist/site/downloads/`, and then produces the static site deployment root.
- The build writes `dist/site/release.json` with the Git revision and SHA-256 for both ZIPs. The local Playwright package regression reads it and checks both real ZIP responses; `npm run verify:live` checks the deployed manifest and package hashes, runs `unzip -t` on each public archive, then unpacks and loads the Chromium archive in a fresh headed profile.
- Added a real ESLint gate (`npm run lint`) for the extension, landing site, tests, and build/release scripts. The static route, CSP, cache, favicon, reader-state, reduced-motion, and privacy fixes from the prior repair remain intact.

## Live proof

- `https://transcript-study-view.sociobot.in/release.json` reports deployed revision `85eabfdcb3f753fb2717d2bae817a22a4dce66cb`.
- Chromium ZIP: HTTP 200, `Content-Type: application/zip`, immutable cache, valid attachment header, SHA-256 `a0094cd9233960f015a7da2ca6466e5da5f753f8abc4748abfd33bdd20cf7a3b`.
- Firefox ZIP: HTTP 200, `Content-Type: application/zip`, immutable cache, valid attachment header, SHA-256 `da39198816945c339b809165ed70f6f70979fc611eb765c3663f251fb5728d6e`.
- `EXPECTED_REVISION=85eabfdcb3f753fb2717d2bae817a22a4dce66cb npm run verify:live` passed: it matched both public ZIPs to the deployed manifest, passed `unzip -t` for each, and loaded the downloaded Chromium extension as **Transcript Study View** in a fresh browser profile.
- Live desktop and 390px mobile checks found no page/console errors, one main and one H1, `lang="en"`, no missing image alt text, 1440/1440 and 390/390 normal layout widths, one first-party request host, and no cookies or site storage. The focused skip link has a 3px outline; reduced motion changes scroll behavior to `auto`.
- Axe found zero violations on the live home page at desktop and reduced-motion 390px, and on live `/privacy/` and `/terms/` at 390px. Live headers include CSP, Permissions-Policy, HSTS, `nosniff`, and strict-origin referrer policy. No service worker is registered because this is a static extension landing site, not a PWA.
- Live Lighthouse mobile: **98 Performance / 100 Accessibility / 100 Best Practices / 100 SEO**; FCP **1.6 s**, LCP **1.9 s**, CLS **0.074**, TBT **0 ms**.

## Local verification

Fresh clean-install sequence passed:

```sh
npm ci
npm test                 # 26 passed
npm run typecheck
npm run lint
npm audit --omit=dev --audit-level=low  # 0 production vulnerabilities
npm run build:site
npm run test:e2e         # 8 passed, 2 intentional mobile-project skips
```

The packaged-extension browser suite covers loading and stale-state isolation, the 390px reader, `/` search, `J` keyboard navigation, local highlight behavior, local ZIP signatures, checksum manifest alignment, axe checks, and no normal-layout overflow. The clean build produced valid Chromium and Firefox packages; both pass `unzip -t`. The extension continues to store captured sessions locally and use only `activeTab` and `storage`; the public site has no analytics, third-party runtime requests, or CDN fonts. Its source-page capture continues to fail closed with clear offline/missing guidance rather than inventing a transcript.

## How to run and deploy

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run build:site
npm run test:e2e
npm run verify:live
```

Deploy `dist/site/` exactly as the static deployment root. `npm run build:site` is required for deployment because it includes `downloads/` and `release.json`; `npm run build` is an equivalent alias. For a local extension smoke test, load `dist/extension/chrome-mv3/` from `chrome://extensions` with Developer mode enabled, open a captioned YouTube video or TED talk, select the extension, and choose **Open study view**.

## Known limits / next steps

- YouTube and TED markup can change. Capture intentionally limits itself to official transcript text already exposed to the viewer and fails closed. A best-effort unsigned live YouTube probe is still susceptible to YouTube's anti-bot/sign-in interstitial; a signed-in captioned-video check is recommended for release operations.
- Browser-store signing/listing is outside this repository. The verified public ZIPs support pilot/manual installation.
- Browser TTS availability and voice quality depend on the user's installed operating-system voices. Localization and highlight export remain out of scope for this v1 brief.
