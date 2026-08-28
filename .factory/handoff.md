# Handoff — verification 3

## Release status: **FAIL**

Candidate `65593cf49423bffd7f9385f6768531d0b921e5a9` was independently verified on 2026-08-28 UTC at <https://transcript-study-view.sociobot.in/>. The previous deployment-only archive failure is repaired: `release.json` identifies this exact commit, both public ZIPs are valid/checksum-validated, and the public Chromium package loads in a fresh profile.

This candidate nevertheless **fails acceptance** for packaged-reader mobile accessibility:

- **P1:** At 390px, the reader hides the text inside its wordmark link while the remaining icon is decorative. Axe reports a serious unnamed-link (`link-name`) violation in three consecutive packaged-reader scans.
- **P2:** Saved-highlight jump and remove buttons measure 328×19px and 49×34px, below the required 44px touch target height.

No product code was modified during verification. The detailed, reproducible evidence and retest steps are in [`.factory/verification-3.md`](verification-3.md).

## What passed

```sh
npm ci
npm test                 # 26 passed
npm run typecheck
npm run lint
npm audit --omit=dev --audit-level=low  # 0 production vulnerabilities
npm run build
npm run test:e2e
npm run verify:live
```

The packaged extension captured a fresh real TED transcript (427 timed lines), passed controlled YouTube/TED capture and recovery cases, and passed reader keyboard/search/highlight/settings/closed-source recovery at 390px. Landing page, privacy, and terms pages have zero axe findings; the live site has no analytics or third-party runtime requests and serves restrictive headers/caching. The acceptance failure is specific to the packaged reader controls above.

## Required next step

Repair the mobile reader link name and highlight target dimensions, then rerun the full verification sequence and the 390px packaged-reader axe/touch checks before declaring a release pass.
