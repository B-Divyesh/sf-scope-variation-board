# Change Ledger — repair handoff

Work order: `scope-variation-board-repair-1`
Implementation candidate: `9f78058218abd11cadde6872b8b065d5558af474`
Previous failed candidate: `b67d6bdd1a9364d8140e3ec44eaf4dee044b9253`
Product URL: <https://scope-variation-board.sociobot.in>
Local verification: 2026-09-06 UTC
Documentation baseline: `2d46d4cdbffaaa02b412b3c823b197f16537751e`

## Live deployment verification

Deployed 2026-09-06 UTC with `/opt/fleet/lib/deploy-static.sh scope-variation-board dist`. The tool reused the existing `sf-scope-variation-board` static app in Central US and completed its upload successfully. The product origin byte-matches the built `dist/index.html` and hashed JavaScript asset from implementation candidate `9f78058`.

- HTTPS home, `/demo`, `/privacy/`, `/terms/`, `/robots.txt`, and `/sitemap.xml` return 200.
- An unknown URL returns the designed 404 page with HTTP 404.
- Home response has the configured CSP, permissions policy, `nosniff`, referrer policy, and no-cache HTML policy. Hashed assets use `Cache-Control: public, max-age=31536000, immutable`.
- Fresh desktop and 390 px mobile contexts show the job headline, solo-freelancer audience, and sample action before scrolling. Both have no console or page errors. The populated change-action controls measure at least 46 px high.
- The live sample opens three cards and the persistent banner. Reset restores the three cards; Start for real returns to an empty real workspace without the banner. Axe found no serious or critical issues on home, demo, privacy, terms, or 404.
- In a dedicated fresh context, the live demo remains readable after service-worker control, offline mode, and reload.
- `/opt/fleet/lib/verify-url.sh https://scope-variation-board.sociobot.in /work/.evidence/svb-final-live` passed: 681 ms load, title, language, one h1, main, image alt, labelled buttons, and no browser errors.

## What changed

- Added `.factory/claims.json` with nine observable public claims. Each claim has exactly one tagged Playwright test, uses the demo entry point, and has an individually runnable command.
- Added `/demo` and `?demo=1`. It loads a realistic Mira Patel ceramics-site ledger with approved, pending, and declined changes.
- Separated sample storage from real storage: demo uses the IndexedDB key `demo:workspace`; real use uses `workspace`. Reset replaces only the sample. Starting for real removes only the sample key.
- Rewrote the first screen in plain words. It states the job, names solo service freelancers, and puts **Try it with sample data** before scrolling on desktop and a 390 px phone.
- Repaired invalid JSON restore handling by validating the file before confirmation. A malformed backup now shows an error and a valid backup restores correctly.
- Repaired stale receipt recovery. A receipt for an earlier revision now says what happened and tells the owner to create a current approval link; it is no longer reported as a storage failure.
- Added browser coverage for valid/invalid JSON backup, JSON receipt import, stale receipts, demo isolation, CSV/JSON/PDF output, offline reload, real approval flow, privacy requests, mobile targets, legal pages, and the designed 404 page.
- Raised all tested mobile controls to at least 44 × 44 px and fixed serious color-contrast findings in populated ledgers.
- Tightened the privacy regression check so it opens an approval link and proves neither approval fragments nor client text enter request URLs.
- Added static-host delivery files: `staticwebapp.config.json`, CSP and permissions policy, immutable cache policy for hashed assets, robots, sitemap, a designed 404, route metadata, and a 1200 × 630 social image.
- Updated the service worker cache to version 4. It caches the repaired shell and does not show an update toast on a first visit.

## Earlier finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| Missing claims manifest and claim tests | Fixed: nine claims and individual demo-based tests. |
| No isolated sample demo | Fixed: `/demo`, `?demo=1`, persistent banner, reset, and start-real controls. |
| Cold page did not name audience or demo action | Fixed: headline names approving scope changes; lead names solo service freelancers; primary sample action is visible first. |
| Invalid backup had no recovery error | Fixed and covered by browser test. |
| Stale receipt showed a storage error | Fixed and covered by browser test. |
| Mobile targets below 44 px | Fixed and checked at 390 px. |
| Missing copy audit, host config, robots, sitemap, 404, CSP, cache policy | Fixed. |

## How to verify from a clean checkout

Requirements: Node.js 22+ and npm.

```bash
npm ci
npm test
npm run build
npm run test:e2e
npm run test:claims
```

Run each exact claim command in `.factory/claims.json` as well. The repair run executed all nine individually after the full suite.

Local results:

- `npm test`: 6/6 passed.
- `npm run build`: passed; `dist/` contains `index.html`, the static-host configuration, legal pages, 404 page, PWA files, robots, and sitemap.
- `npm run test:e2e`: 15 passed, 15 expected mobile/desktop project skips; no failures.
- Every declared claim command: one Chromium pass and one expected mobile-project skip; no failures.
- Playwright axe: no serious or critical findings on landing, demo, privacy, terms, and 404 pages.
- `npx @axe-core/cli` could not discover a system Chrome in this runner. The project’s pinned Playwright axe integration was run instead, including a final direct scan of live `/demo`, with no violations.
- `/opt/fleet/lib/verify-url.sh http://127.0.0.1:4173`: passed title, language, one h1, main, image alt, labelled buttons, and no browser errors.
- Lighthouse 13.4.1, local mobile profile: performance 98, accessibility 100, best practices 100, SEO 100; LCP 1.36 s, CLS 0.091, TBT 0 ms.
- Production build: 41.46 KB JavaScript raw / 12.50 KB gzip; 17.16 KB CSS raw / 4.79 KB gzip; 69 KB hero WebP and 53 KB social WebP.

## Privacy and paid offer

The free core remains local-first and works without a billing registration. The existing $19 one-time unlimited-ledger offer was preserved. Public billing metadata is at `/work/.evidence/billing-offer.json`; it contains no credential. Hosted checkout and entitlement verification remain dependent on the factory billing-registration operator.

## Known limits

- Browser storage can be cleared. Users should download JSON backups for important records.
- Hashes detect changed content but do not prove identity or legal enforceability.
- Print/PDF uses the browser print path, so final PDF controls depend on the browser.
- The catalog description is copied to `/work/.evidence/catalog-description.txt`. The billing-offer metadata is at `/work/.evidence/billing-offer.json`; both are operator-facing evidence files and contain no credential.
