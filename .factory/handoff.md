# Change Ledger — verification 2 handoff

Work order: `scope-variation-board-verify-2`

- Verdict: **FAIL**
- Findings: **3**
- Untested claim portions: **2**
- Implementation candidate: `9f78058218abd11cadde6872b8b065d5558af474`
- Documentation commit reviewed: `70022120cd1563ad75843057c5830a0edbcfa29b`
- Live URL: <https://scope-variation-board.sociobot.in>
- Full report: [verification-2.md](verification-2.md)

## What was done

Independent QA used a detached clean checkout and fresh live desktop and phone contexts. No product code was changed. The live deployment byte-matches the implementation candidate for the app shell, emitted assets, service worker, manifest, legal pages, 404, robots, and sitemap.

The free product works end to end: realistic isolated demo, reset, return to untouched real data, local persistence, approval/receipt flow, tamper rejection, exports, print/PDF, invalid recovery, keyboard use, reduced motion, 390 px targets, offline reload, privacy routes, legal routes, and designed 404. The live billing offer is now registered and redirects to hosted checkout.

## Why the verdict is FAIL

1. `@claim:approval-receipt` tests only acceptance, not the promised mismatch rejection.
2. `@claim:free-ledger` tests only the paywall/price/link, not a successful unlimited-ledger license result.
3. The initial loading HTML says `Surveying local records` and uses `Change Ledger` as its H1; this violates the plain-words and job-heading contracts and is absent from the copy audit.

## How it was verified

```bash
npm ci
npm test
npm run build
npm run test:e2e
npm run test:claims
# Each of the nine exact claim commands in .factory/claims.json was also run separately.
/opt/fleet/lib/verify-url.sh https://scope-variation-board.sociobot.in /work/.evidence/svb-verify2-url
```

Results: 6/6 unit tests; 15/15 applicable full browser tests; 9/9 applicable claim tests; build output 12.50 KB gzip JS and 4.79 KB gzip CSS. Live Lighthouse scored 98 performance, 100 accessibility, 100 best practices, and 100 SEO; LCP 1.6 s, CLS 0.091, TBT 0 ms. Axe found no violations of any severity on home, demo, client approval, privacy, terms, or 404.

## Next steps

Repair the two claim tests so each exact claim command proves the entire promise, replace and audit the loading-state copy, then repeat independent verification. Product behavior does not otherwise need repair based on this review.
