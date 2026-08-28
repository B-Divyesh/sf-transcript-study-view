# Handoff — verification 3 repair

## Release status: **PASS locally; deployment verification pending push**

This repair addresses every release-blocking finding in the independent verifier’s
[`verification-3.md`](verification-3.md) report for candidate
`65593cf49423bffd7f9385f6768531d0b921e5a9`, while keeping the existing WXT
Manifest V3 extension and static-site deployment class.

## Repairs

- The reader wordmark now has the explicit accessible name **“Transcript Study
  View home.”** Its visible label may still be removed at 390px without leaving
  a screen-reader user with an unnamed link.
- Saved-highlight jump and remove controls now each have a real 44px minimum
  interactive height. The jump control also vertically centers its transcript
  excerpt within that hit area.
- The packaged-reader regression test now seeds a saved mobile highlight in
  extension-local storage, scans the actual sideloaded MV3 reader at 390×844
  with axe, requires zero violations, checks the wordmark accessible name, and
  measures both saved-highlight controls at `>= 44px` high. It retains the
  existing loading, stale-session, `/` search, `J` navigation, and no-overflow
  checks.

## Verification evidence

Fresh local verification on 2026-08-28 UTC:

```sh
npm ci                                      # pass; WXT preparation completed
npm test                                    # pass: 26 tests / 3 files
npm run typecheck                           # pass
npm run lint                                # pass
npm audit --omit=dev --audit-level=low      # pass: 0 production vulnerabilities
npm run build                               # pass: Chromium + Firefox MV3 and dist/site
npm run test:e2e                            # pass: 8 passed, 2 intentional mobile skips
unzip -t dist/site/downloads/*.zip          # pass for both packages
npm run verify:live                         # pass against pre-repair live revision 65593cf…
```

The Playwright run exercises the packaged extension in headed Chromium under
Xvfb, seeds a 390px reader session, verifies the repaired mobile axe/touch
conditions, keyboard search and paragraph navigation, loading/stale recovery,
and checks the desktop/mobile landing, legal pages, archive response, axe, and
overflow behavior. Site axe scans and the repaired packaged-reader scan report
zero violations. The build produces a 140.8 KB unpacked Chromium extension,
0.92 KB site JavaScript, 12.38 KB site CSS, 84.82 KB self-hosted fonts, and a
43.08 KB 960px AVIF hero—within the product budgets.

Local mobile Lighthouse produced Performance 100, Accessibility 100, Best
Practices 100, and SEO 100 (FCP 1.0s, LCP 1.8s, CLS 0, TBT 0ms). Lighthouse
wrote the complete JSON result, then its Chromium target crashed while taking
the final screenshot and returned non-zero; this is the same post-report
teardown anomaly recorded by the independent verifier, not a reported page
failure.

`npm run verify:live` confirmed the currently deployed pre-repair release
identifies revision `65593cf49423bffd7f9385f6768531d0b921e5a9`, serves both
ZIPs as `application/zip`, validates their checksums and archive contents, and
loads the public Chromium archive in a fresh profile. The live response check
also confirmed the restrictive CSP, Permissions-Policy, nosniff,
strict-origin referrer policy, HSTS, short HTML caching, and immutable ZIP
caching. The static site intentionally has no service worker because it is not
a PWA; offline transcript capture continues to fail closed with existing
recovery guidance, and no update behavior was changed.

## Deployment follow-up

Push the repair commit and deploy `dist/site/` using the static work-order
configuration. Then run:

```sh
EXPECTED_REVISION="$(git rev-parse HEAD)" npm run verify:live
```

That command is the final live identity, archive-integrity, and fresh-profile
consumer-install check. No product gaps are known beyond the environment’s
Lighthouse screenshot-teardown issue noted above.
