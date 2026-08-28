# Independent verification 3 — FAIL

**Work order:** `transcript-study-view-verify-3`  
**Candidate:** `65593cf49423bffd7f9385f6768531d0b921e5a9` (`docs: record release repair verification`)  
**Repository:** clean checkout at that exact commit  
**Live URL:** <https://transcript-study-view.sociobot.in/>  
**Date:** 2026-08-28 UTC

## Verdict

**FAIL.** The prior deployment-only failure is repaired: the live site identifies the candidate commit and serves working, checksum-validated installation archives. The core capture-and-reader journey also works in an independently loaded package, including a fresh real TED transcript. However, the 390px packaged reader has a reproducible **serious axe `link-name` violation**, and two saved-highlight controls miss the required 44px touch target. The product contract requires zero serious/critical accessibility findings and 44px controls, so this candidate cannot pass unchanged.

## Reproducible defects

### P1 — Mobile packaged reader exposes an unnamed link (axe serious)

At a 390px viewport, `styles/reader.css` hides `.wordmark span`. The remaining logo image has `alt=""`, while its parent `<a class="wordmark">` has no `aria-label`. Thus the top-left link to the product website has no accessible name for screen-reader users.

Fresh axe scans of a seeded, packaged MV3 reader session reported the same serious finding in **three consecutive 390px reduced-motion runs**:

```
link-name (serious)
<a class="wordmark" href="https://transcript-study-view.sociobot.in" ...>
  <img ... alt=""><span>Transcript Study View</span>
</a>
```

The span is visually hidden by the mobile media query, so it does not contribute an accessible name. Give the link an explicit accessible name (or retain screen-reader-only text) and rerun axe against the actual extension reader at 390px.

### P2 — Saved-highlight controls are too small for touch

In the same 390px packaged reader with a saved highlight, measured clickable rectangles were:

| Control | Measured size |
| --- | --- |
| Highlight jump | 328 × 19px |
| Remove highlight | 49 × 34px |

These are independently focusable buttons and neither meets the 44px minimum height in the acceptance contract. Increase their interactive hit areas (not only surrounding decoration), then remeasure on mobile.

## Local quality gates

| Check | Fresh result |
| --- | --- |
| `npm ci` | Pass; clean install completed and WXT prepared. npm reported 11 dependency advisories across the full development tree. |
| `npm test` | Pass — **26/26** tests in 3 files. |
| `npm run typecheck` | Pass. |
| `npm run lint` | Pass. |
| `npm audit --omit=dev --audit-level=low` | Pass — **0 production vulnerabilities**. |
| `npm run build` | Pass — exact production build created Chromium/Firefox MV3 packages and `dist/site/`. |
| `npm run test:e2e` | Pass — Playwright’s 10-project run completed with **8 passed and 2 intentional mobile-project skips**; its recorded status is `passed`. |
| `npm run verify:live` | Pass — current deployment revision, both ZIPs, archive integrity, and a fresh-profile Chromium load verified. |

The production build reports a 140.72 KB unpacked extension. Site payloads meet the stated static budgets: 918 B JavaScript, 12,382 B CSS, 84,820 B total self-hosted fonts, and a 43,078 B 960px AVIF hero. Both locally built ZIPs pass `unzip -t`.

Mobile Lighthouse against the live landing page produced **100 Performance / 100 Accessibility / 100 Best Practices / 100 SEO**, FCP 1.0 s, LCP 1.5 s, CLS 0, and TBT 0 ms. Lighthouse wrote the complete result, then its Chromium target crashed while collecting its final screenshot and returned non-zero; this is recorded as a tooling teardown anomaly, not treated as a passing process exit.

## End-to-end product evidence

The packaged Chromium extension was loaded into fresh headed Chromium profiles under Xvfb; no source modules were substituted.

- A controlled YouTube page exposing an official `ytInitialPlayerResponse` caption track yielded three JSON3 lines at 0, 25, and 51 seconds through `EXTRACT_TRANSCRIPT`. The source title survived, and `SEEK` moved the existing video to 25 seconds.
- A controlled TED transcript-row page yielded two timestamped TED lines. A no-caption YouTube fixture returned the intended `missing` recovery guidance rather than fabricating text.
- A fresh public TED page, `https://www.ted.com/talks/sir_ken_robinson_do_schools_kill_creativity`, captured **427** timed lines through the packaged extension (`first.start: 10.753`). This is a real supported-source normal case.
- A public YouTube probe was gated by YouTube’s “Sign in to confirm you’re not a bot” interstitial. The extension failed closed with the documented `missing` guidance; it did not fetch around the restriction. This does not prove a signed-in YouTube experience.
- In a 390px reader: invalid search gave `0 paragraphs found`, a valid replacement search recovered, `/` focused search, `J` moved the current paragraph, a selected passage was stored locally, text size stopped at 17px, spacing and dark theme applied, and a timestamp whose source tab was closed opened the original URL with `t=25s`. There was no overflow or console/page error in that exercise.
- Loading and stale-session behavior passed the repository E2E suite. The reader’s normal mobile width was 375/375 client/scroll width in headed Chromium (the 15px scrollbar accounts for the 390px viewport).

## Accessibility, privacy, response, and deployment evidence

- Live landing page checks at 1440px and 390px had `lang="en"`, exactly one `h1`, exactly one `main`, no horizontal overflow, no page/console/request errors, and zero axe violations. `/privacy/` and `/terms/` each also had one main/h1 and zero axe violations at 390px.
- Keyboard Tab reached the live skip link. At desktop its computed focus ring was a visible 3px copper outline. Under reduced motion, live scroll behavior became `auto` and button transitions became `0.01ms`; the packaged reader likewise used `auto` scrolling and `0.01ms` transitions.
- Landing-page network traffic was limited to `transcript-study-view.sociobot.in`; there were no cookies, local/session-storage entries, analytics hosts, runtime third-party scripts, CDN fonts, or service worker. Source inspection and the manifest corroborate `activeTab` + `storage` only; transcript sessions use extension session storage and highlights/settings use extension local storage. The only remote extension fetch is the source-provided YouTube caption URL, with source-page credentials.
- Live `/`, JS, and ZIP responses are HTTPS with CSP (`default-src 'self'` and `connect-src 'self'`), Permissions-Policy, `nosniff`, strict-origin referrer policy, and HSTS. HTML is `max-age=30`; hashed assets, fonts, and ZIPs are `max-age=31536000, immutable`. The Chromium ZIP is HTTP 200, `application/zip`, attachment-disposition, and 111,513 B.
- `release.json` reports revision **`65593cf49423bffd7f9385f6768531d0b921e5a9`**. Both public ZIPs checksum-match that manifest and load/check successfully via `npm run verify:live`. Raw ZIP hashes differ from a fresh local build because the archive metadata is non-deterministic, but recursive comparison of unpacked Chromium file paths and SHA-256 payloads was identical. Fresh local/live landing HTML also matched byte-for-byte (`cdfe3caed8e1d18f4ee33ee1337395ff25742b6d56bc58dcc91b8fe3edbea0ba`).

## Retest criteria

1. Fix the unnamed mobile wordmark link and run axe against a real packaged reader session at 390px; serious/critical must be zero.
2. Make saved-highlight jump/remove controls at least 44px tall, then remeasure them at 390px.
3. Re-run the complete clean-install gates, packaged extension flow, and `npm run verify:live`; confirm the deployment still identifies the repaired candidate revision and its public archives install.
