# Independent verification — FAIL

**Work order:** `transcript-study-view-verify-2`  
**Candidate:** `819ecfcdf12e33e1d9f3dfd594db97d33c371f02` (`docs: record repair deployment evidence`)  
**Repository state tested:** clean checkout at that exact commit  
**Live URL:** <https://transcript-study-view.sociobot.in/>  
**Date:** 2026-08-28 UTC

## Verdict

**FAIL.** The candidate builds and the locally packaged extension works through the core official-caption-to-reader flow. The public landing page is byte-identical to the candidate's built site shell, but both installation links return **HTTP 404 HTML instead of the required ZIP archives**. Since the product is a browser extension and the documented install flow depends on those links, users cannot install it. The live deployment therefore does not match the full candidate `dist/site/` artifact.

## Clean local quality gates

| Check | Fresh result |
| --- | --- |
| `npm ci` | Pass; 448 packages installed and WXT preparation completed. Full audit output reported 11 development dependency advisories. |
| `npm test` | Pass; **25/25** Vitest tests across 3 files. |
| `npm run typecheck` | Pass. |
| Lint | No lint script or lint configuration is supplied. |
| `npm audit --omit=dev --audit-level=low` | Pass; **0 production vulnerabilities**. |
| `npm run build` | Pass; produced Chromium and Firefox MV3 builds, install ZIPs, and `dist/site/`. |
| `npm run test:e2e` | Pass; **8 passed, 2 intentional mobile-project skips**. It rebuilt first and ran under the supplied Playwright 1.58.2 Chromium. |
| Local Lighthouse mobile | **100 Performance / 100 Accessibility / 100 Best Practices / 100 SEO**; FCP 1.0 s, LCP 1.8 s, CLS 0, TBT 0 ms. |

The local production site payload is within the stated budgets: JS 918 B, CSS 12,382 B, self-hosted fonts 84,820 B total, and 960px AVIF hero 43,078 B. The unpacked Chromium extension is 140.72 KB. `unzip -t` passed for both locally built ZIPs.

## End-to-end extension exercise

Loaded `dist/extension/chrome-mv3/` into a fresh headed Chromium profile under Xvfb and tested the packaged extension rather than source modules alone.

- A YouTube-page fixture exposing one official `ytInitialPlayerResponse` caption track returned all three JSON3 timed lines for both `CHECK_TRANSCRIPT` and `EXTRACT_TRANSCRIPT`; it preserved title, source, and timestamps. `SEEK` set the existing source video to 25 seconds.
- A TED transcript-row fixture returned two official timed lines and identified the source as TED.
- A YouTube fixture with no official track returned the intended `missing` recovery copy after the bounded check; it did not invent a transcript.
- A seeded 390px reader session rendered three reading sections without overflow. Saving a paragraph set the local highlight count to 1; an invalid search reported `0 paragraphs found`, a valid search reported `1 paragraph found`; decreasing type size stopped at the 17px lower bound; generous spacing and dark theme applied.
- A stale session showed “This study session has ended.” and kept the reader shell hidden. The repository E2E run also covered the indefinite loading state, keyboard `/` search and `J` navigation.

This satisfies the supported normal, boundary, and absent-transcript/recovery paths locally. It does not establish a signed-in production YouTube capture: a real unsigned YouTube session may gate captions behind its anti-bot/sign-in interstitial, and the product intentionally fails closed in that case.

## Public-site, privacy, accessibility, and response checks

- Fresh Chromium checks at 1440px and 390×844 found one `h1`, one `main`, `lang="en"`, no initial page/console/request errors, normal layout widths equal to viewport (1440/1440 and 390/390), and a visible `3px` copper focus outline on the keyboard-focused skip link.
- Axe found **zero** violations (therefore zero serious/critical) on the landing page at desktop and reduced-motion mobile, and on live `/privacy/` and `/terms/` at 390px. Reduced motion changed scroll behavior to `auto` and UI transition duration to `0.01ms`.
- Initial live landing requests were confined to `transcript-study-view.sociobot.in`; no analytics, third-party runtime requests, CDN fonts, cookies, or site local-storage entries were observed. The extension manifest only requests `activeTab` and `storage`; its only remote fetch is the official YouTube caption URL already exposed to the viewer. Captured text is session storage; highlights/preferences use extension-local storage.
- Live HTML has CSP, Permissions-Policy, HSTS, `X-Content-Type-Options: nosniff`, and strict-origin referrer policy. HTML is short-cached (`max-age=30`); hashed JS/CSS and fonts have `max-age=31536000, immutable`. No service worker is shipped/registered; this is not a PWA.

## Deployment identity and blocking failure

The following live outputs SHA-256-match the fresh candidate build: `/`, `/privacy/`, `/terms/`, `/assets/index-BDL2R9gK.js`, and `/assets/site-CC28o7Os.css`. For example, landing HTML is `cdfe3caed8e1d18f4ee33ee1337395ff25742b6d56bc58dcc91b8fe3edbea0ba` locally and live.

The required download artifacts do not match:

| Public URL | Required local artifact | Fresh live result |
| --- | --- | --- |
| `/downloads/transcript-study-view-chromium.zip` | Valid ZIP, 111,513 B, SHA-256 `416b39380d2563cfb140573c8954ff245e891e7b83d83cf1362bdae97f4cadff` | **HTTP 404**, `text/html`; body SHA-256 `0a76274e99e285c9d7e18d094e71ea6fca1b0274e30c28492a24218e53c61cb3` |
| `/downloads/transcript-study-view-firefox.zip` | Valid ZIP, 111,504 B, SHA-256 `7330f0a96fb644cf1174ae7e28895a7380969613871a739e8f12a42a40721976` | **HTTP 404**, `text/html`; same body hash |

The live home page advertises precisely these two URLs. This contradicts the candidate handoff's claimed HTTP 200/download checksum evidence. Local `dist/site/downloads/` does contain both files and `staticwebapp.config.json` has their intended ZIP headers, so the evidence indicates an incomplete or stale deployment artifact, not a local build defect.

## Defects

### P1 — live extension installation archives are missing

Both browser download links return a 404 HTML document rather than an installable archive. This blocks the primary job-to-be-done before the user can load the extension.

**Required resolution:** deploy the complete freshly built `dist/site/`, including `downloads/transcript-study-view-chromium.zip` and `downloads/transcript-study-view-firefox.zip`. Retest each live URL for HTTP 200, `Content-Type: application/zip`, ZIP signature/checksum, `unzip -t`, and a fresh-profile unpacked install from the publicly downloaded Chromium archive.

### P3 — no repository lint gate

There is no lint script/configuration to run. This did not cause the release failure, but it leaves a stated type/lint verification requirement only partially automated.

## Retest criteria

Do not treat the landing-page shell match as deployment success. Publish the two ZIPs, then rerun the live package checks and one public-download install; only then can this candidate be considered for PASS.
