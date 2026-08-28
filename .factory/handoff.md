# Change Ledger — build handoff

Work order: `scope-variation-board-build-1`

Completed: 2026-08-28

## Delivered

- A production-built Vite + vanilla TypeScript offline PWA in `dist/`.
- IndexedDB client ledgers, base quote/scope, currency, and revisioned fixed-price change cards.
- Frozen client approval links whose payloads live in URL fragments, with canonical SHA-256 content fingerprints and issue timestamps.
- Account-free client approve/decline view and return-link/JSON receipts with a second SHA-256 fingerprint.
- Strict receipt matching on project, change, revision and issued payload hash. Work cannot be marked done until the current revision has an approved receipt.
- Prior decisions remain in exported history when a change is revised; the visible card makes clear that the new revision needs a new decision.
- CSV export with spreadsheet-formula injection protection, full JSON backup/restore, receipt import, and print/PDF output.
- Free one-ledger experience plus a $19 one-time Sociobot license unlock for unlimited active ledgers. License capture, daily cached verification, quiet invalid-license state, offline cached entitlement and paste-to-restore are implemented. No product ID or payment provider is embedded.
- Versioned service worker, generated-asset precache, cache-first static assets, network-first license verification, offline fallback, update toast, install manifest and 192/512 maskable icons.
- `/privacy/` and `/terms/` static pages, MIT license, and complete README.
- Original topographic paper-relief hero, 69 KB WebP. Source, prompt and provenance are retained in `assets/src/`; the visual thesis is in `.factory/design.md`.

## Verification

Run from a clean clone with Node 22+:

```bash
npm ci
npm test
npm run build
npm run test:e2e
```

Results on the worker:

- `npm test`: 6/6 unit tests passed.
- `npm run build`: passed; output at `dist/index.html`.
- Playwright 1.58.2: 5 passed, 3 intentionally project-skipped. The passing coverage includes the end-to-end owner → client → owner approval round trip, axe scan, first offline reload, and 390 px overflow check.
- Axe integration: no serious or critical violations on the empty state.
- `npm audit`: 0 vulnerabilities after updating Vite and Vitest.
- Initial production assets: 36.4 KB JavaScript raw / 11.1 KB gzip; 15.6 KB CSS raw / 4.5 KB gzip; 69.2 KB hero WebP. No fonts ship.
- Lighthouse 13 mobile profile against `vite preview`: performance 98, accessibility 100, best practices 100, SEO 92; LCP 1.9 s, CLS 0.091, total blocking time 30 ms.
- Manual visual review: desktop populated ledger screenshot and generated hero checked; no text/logo artifacts in the hero.
- Factory `verify-url.sh`: HTTP 200, title/lang/main/alt/button checks passed, one h1, 601 ms network-idle load, and no page or console errors.

## Known limits / honest boundaries

- Approval and receipt links are self-contained and therefore can be long. JSON receipt download/import is the fallback for messaging systems that truncate URLs.
- A hash detects changed content but does not verify a person's identity. The UI and terms explicitly avoid electronic-signature or enforceability claims.
- “Print / PDF” uses the browser print dialog rather than generating a binary PDF in JavaScript; this keeps the export offline, accessible and dependency-free.
- Browser storage can be erased by the user or browser. The app cannot recover it; regular JSON backups are recommended.
- The production billing endpoint is wired to the product slug, but successful purchase verification depends on the factory registering the product. Staging can be built with `VITE_BILLING_BASE=https://pilot-api.sociobot.in`.
- The product is deliberately single-mode (light survey sheet), as documented in the design thesis.

## Suggested next steps

- Register the paid product and run one hosted checkout/return test in staging.
- Validate the final static host's clean-path behavior and immutable caching headers.
- Pilot with freelancers and measure the stated 60-day decision-before-done rate; the app itself adds no analytics, so pilot measurement should use consented, aggregate reporting outside client records.
