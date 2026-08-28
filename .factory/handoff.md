# Change Ledger — independent verification handoff

Work order: `scope-variation-board-verify-1`
Candidate: `b67d6bdd1a9364d8140e3ec44eaf4dee044b9253`
Live URL: <https://scope-variation-board.sociobot.in>
Verified: 2026-08-28 UTC
**STATUS: FAIL — DO NOT RELEASE**

The live deployment byte-matches the candidate, so this is a candidate failure rather than a deployment-only issue.

## Blocking findings

- `.factory/claims.json` is missing. Required claim tests cannot be run, despite unlisted offline, export, privacy, and local-storage claims.
- The mandatory one-click `Try it with sample data` demo is absent. `/demo` and `?demo=1` show the normal empty app, with no sample data, separate storage, demo banner, reset, start-real control, or `.factory/demo.md`.
- The cold first screen does not name solo service freelancers and uses the non-plain headline “Approve the detour before you do the work.”

## Additional defects

- Live file import of invalid backup JSON selects the file but never shows an error; JSON restore/receipt-import fallback is therefore not verified as working.
- Stale receipt handling presents a false “Local storage error” instead of the recovery action.
- Populated 390 px controls include 40–43 px targets, below the required 44 px minimum.
- Missing copy audit, static-host config, robots/sitemap, designed 404, CSP, and immutable hashed-asset caching.

## What passed

`npm ci`, unit tests (6/6), production build, and Playwright (5 passed, 3 intended skips) pass. The live core approval flow, hash tamper rejection, revision rules, CSV/JSON download, persistence, offline reload, keyboard smoke test, reduced motion, mobile no-overflow, and axe serious/critical scans pass. Lighthouse live: 98 performance / 100 accessibility / 100 best practices / 100 SEO. The license verification endpoint rate-limited at request 30 with `429 Retry-After: 3`.

Read the complete evidence and remediation list in `.factory/verification.md`. Re-verify only after every blocker is repaired.
