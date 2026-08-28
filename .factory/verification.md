# Independent verification — FAIL

**Work order:** `transcript-study-view-verify-1`  
**Candidate:** `5f21fd859d794a2b23a8f8d3328d32b581cd680f` (`fix: read current YouTube official caption tracks`)  
**Repository state tested:** clean checkout at that exact commit  
**Live URL checked:** https://transcript-study-view.sociobot.in/  
**Date:** 2026-08-28 UTC

## Verdict

**FAIL.** The locally built extension and site largely work, including the candidate's new official YouTube caption-track path. The live site nevertheless cannot deliver either browser package: both advertised ZIP URLs return the landing page as HTML. This prevents normal installation and means the deployment is not the candidate's complete `dist/site` artifact. A reader error-state rendering defect also violates the required recovery-path quality.

## Commands and build evidence

| Check | Fresh result |
| --- | --- |
| `npm ci` | Pass; 448 packages installed and WXT preparation completed. |
| `npm test` | Pass; 18/18 Vitest tests. |
| `npm run typecheck` | Pass. |
| Lint | No lint script/configuration is supplied. |
| `npm run build` | Pass; Chromium and Firefox MV3 builds and ZIPs plus `dist/site/` produced. |
| `npm run test:e2e` | First run could not start because the lockfile resolves Playwright 1.62.1 while only browser revision 1208 was preinstalled. After the prescribed `npx playwright install chromium`, pass: 5 passed, 1 intentional desktop-project skip. |
| `npm audit --omit=dev --audit-level=low` | Pass; 0 production vulnerabilities. |

The production build measured 918 B site JavaScript, 12,405 B CSS, 84,820 B self-hosted fonts, 43,078 B mobile AVIF hero, and 140,667 B unpacked Chromium extension. These are within the stated static budgets.

## Product exercise

### Packaged extension

- Loaded `dist/extension/chrome-mv3/` in a fresh Chromium profile.
- On a browser-loaded `https://www.youtube.com/watch?...` fixture whose page-owned `ytInitialPlayerResponse` exposed one official JSON3 track, `CHECK_TRANSCRIPT` and `EXTRACT_TRANSCRIPT` each returned all three timed lines with the expected title and source. `SEEK` set the existing source `<video>` to 9 seconds. This directly exercises the candidate's new MAIN-world bridge and timestamp return path.
- On a YouTube fixture with no track, `EXTRACT_TRANSCRIPT` returned the intended `missing` recovery message after its bounded retry window.
- On a TED transcript-row fixture, `CHECK_TRANSCRIPT` returned both official timed lines and identified `TED`.
- Seeded a session into the packaged reader at 390×844: three shaped reading sections, one H1, no normal-layout horizontal overflow, zero axe violations, and no page/console errors. Search reported `0 paragraphs found` for an invalid query and `1 paragraph found` for a valid one; saving a paragraph increased the local highlight count to 1; type size clamped at 17 px; generous spacing and the dark theme worked; keyboard focus on the theme control was a visible 3 px solid outline.
- A stale/absent session correctly changed its error copy, but also exposed the rendering defect listed below.

### Real source probe

A fresh unsigned headless Chromium probe of `https://www.youtube.com/watch?v=aqz-KE-bpKQ` received YouTube's **“Sign in to confirm you’re not a bot”** interstitial. The extension honestly returned `missing`; no official caption track was available to test in this environment. This is not treated as a product failure, but it means signed-in real-page capture remains unverified here.

### Public site, accessibility, privacy, and motion

- Local Playwright site suite: axe found zero violations on landing, privacy, and terms across desktop/mobile; 390 px test passed with no horizontal overflow.
- Fresh live Chromium checks on desktop and 390 px/reduced motion: one `<main>`, one `<h1>`, English `lang`, hero image loaded, visible 3 px focus treatment, reduced-motion media query active, and zero axe serious/critical findings (in fact zero axe findings).
- Automated live requests on initial load were confined to `transcript-study-view.sociobot.in` (document, two self-hosted fonts, JS, CSS, and images). No analytics, third-party runtime scripts, CDN fonts, or external network calls were observed.
- Live desktop Chrome recorded one console error for missing `/favicon.ico` (404). A 390 px normal-layout probe had no horizontal overflow. The desktop DOM's `scrollWidth` was 1474 px at a 1440 px viewport because hero decoration extends outside its section; `body { overflow-x: hidden }` masks that extent.
- Reduced-motion rules use instant transition/scroll behavior. No service worker is present or required: this is not a PWA.

## Deployment identity and HTTP policy

The deployed landing page, privacy page, terms page, site JS, CSS, and sampled hero AVIF were byte-identical to this candidate's freshly built `dist/site` outputs (SHA-256 compared). The deployed install packages are not:

| URL | Expected local artifact | Actual live response |
| --- | --- | --- |
| `/downloads/transcript-study-view-chromium.zip` | ZIP, 111,501 B, SHA-256 `b43f1e65e9212ba89aa7868e69fb67e6ea77f5035dcd7347348665be782f68b9` | HTTP 200 `text/html`, 8,261 B; SHA-256 of the landing page `43f27f16ca3fadf2ea084ea40b20ef6f7ddf497b1a2e945c283d886d67e2277f` |
| `/downloads/transcript-study-view-firefox.zip` | ZIP, 111,492 B | HTTP 200 `text/html`, 8,261 B (same landing-page fallback) |

The live server supplies HSTS, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`. It does not send a Content-Security-Policy or Permissions-Policy. HTML, hashed assets, and fonts all use only `Cache-Control: public, must-revalidate, max-age=30`, rather than long-lived immutable caching for hashed static assets.

## Defects

### P1 — advertised extension downloads are HTML, not installable ZIPs

Both installation links on the live site return the home document with HTTP 200. A person following the documented install flow cannot unzip or load either package. This blocks the primary job-to-be-done and proves the deployment is incomplete relative to candidate `dist/site/downloads/`.

**Required resolution:** deploy both ZIPs at their linked paths and verify `Content-Type: application/zip`, expected ZIP bytes/checksums, and a successful manual unpacked-install flow from the live download.

### P2 — reader error/loading shell is visually displayed while marked hidden

`styles/reader.css` sets `.reader-shell { display: grid; }`, which overrides the browser's `[hidden] { display: none }` rule at equal specificity. With `reader.html?session=absent`, `#error-state` is visible as intended, but `#reader-shell` remains computed-visible (`locator.isHidden() === false`) despite its `hidden` attribute. The blank reader chrome/controls can appear alongside an error or loading state, undermining required empty/error recovery.

**Required resolution:** explicitly honor `[hidden]` (for example, add `.reader-shell[hidden], .state-page[hidden] { display: none; }`) and cover loading/stale-session visual states with an extension browser test.

### P2 — fresh e2e command is not runnable with supplied browsers

`package.json` permits `@playwright/test` `^1.55.0`; the committed lockfile resolves 1.62.1, which expects Chromium revision 1234. The supplied environment contains revision 1208, so an unmodified `npm run test:e2e` fails before tests execute. Verification succeeded only after downloading a new browser. Pin the prescribed Playwright version or make test setup install its matching browser deterministically.

### P3 — live load reports a favicon 404

Desktop Chrome logs `Failed to load resource: the server responded with a status of 404 ()` for `/favicon.ico`. This violates the no-console-errors-on-load gate, although it does not block task flow.

### P3 — static response policy/cache gaps

The live deployment has no CSP/Permissions-Policy and gives immutable hashed assets only a 30-second cache lifetime. Add an appropriate static CSP/Permissions-Policy and immutable caching for content-hashed assets while retaining short caching for HTML.

### P3 — masked desktop layout overflow

At a 1440 px desktop viewport the document has a 1474 px scroll width due to the hero decoration; `overflow-x: hidden` suppresses the scrollbar. Constrain the decoration rather than relying on clipping.

## Retest criteria

Rebuild and deploy candidate artifacts, then retest both live downloads as real ZIPs, install one from the live URL into a fresh profile, and retest reader loading/stale-session screens. Confirm a clean `npm ci && npm run test:e2e` works with the declared Playwright/browser version and that live page load has no 404/console errors.
