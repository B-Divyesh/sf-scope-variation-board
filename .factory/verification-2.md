# Verify scope-change approvals — independent QA

## Verdict: FAIL

- **Finding count:** 3
- **Untested claim count:** 2
- **Implementation candidate:** `9f78058218abd11cadde6872b8b065d5558af474`
- **Documentation commit:** `70022120cd1563ad75843057c5830a0edbcfa29b`
- **Live URL:** <https://scope-variation-board.sociobot.in>
- **Verified:** 6 September 2026 UTC

The free local-first product works end to end, the repaired live deployment matches the implementation candidate, and every automated command exits successfully. The verdict is still **FAIL** because two declared claim tests do not prove the complete public claim, and one loading-state heading violates the required plain-words contract. PASS requires zero findings and zero untested claim portions.

## Findings

1. **[HIGH] The approval-receipt claim command proves only the valid case.** The claim says a decision is recorded “only when it matches the frozen change revision.” `npm run test:e2e -- --grep @claim:approval-receipt` creates a matching receipt and sees it accepted, but never submits a changed, unrelated, or stale receipt and asserts rejection. The unit suite and an untagged browser test cover altered payloads and stale revisions, and the live product rejected both during this review. That proves the implementation, but not the required independently runnable claim command. Add the mismatch assertion to the single tagged claim test.

2. **[HIGH] The paid-ledger claim command does not prove the paid result.** The public claim says “One active ledger is free; unlimited active ledgers cost $19 once.” `npm run test:e2e -- --grep @claim:free-ledger` proves the free limit, displayed price, and checkout-link address only. It does not provide a recorded valid verification response, restore a license, create a second active ledger, or test invalid/revoked reconciliation. The live checkout registration now returns a hosted-checkout redirect, but a link is not proof that the promised paid result occurs. Add a fixture-backed valid-license browser path that creates at least two active ledgers, plus the invalid/revoked recovery relevant to the public promise.

3. **[LOW] The initial loading screen uses a metaphor heading and a product-name H1.** The shipped `index.html` shows `Surveying local records` above `<h1>Change Ledger</h1>` until the application replaces it. The required copy contract forbids metaphor or mood headings, and the site-structure contract requires the page H1 to name the job rather than only the product. `.factory/copy-audit.md` audits only the post-load landing view, so it misses this public loading state. Replace the eyebrow and H1 with direct loading copy and include them in the copy audit.

## Declared claims

Each exact command in `.factory/claims.json` was run from a detached clean checkout after `npm ci`. Every command exited 0 with one Chromium pass and one intentional mobile-project skip. The table distinguishes command success from contract completeness.

| Claim | Command result | Verification result | Evidence |
| --- | --- | --- | --- |
| `sample-demo` | Pass | Pass | One click opened `/demo`, the persistent sample banner, and three realistic change cards. |
| `demo-isolation` | Pass | Pass | A demo-only negative-price change persisted on reload, Reset removed it, and Start for real restored the untouched real ledger. |
| `approval-receipt` | Pass | **Incomplete** | Tagged command tests acceptance only; mismatch rejection is outside the declared claim command. |
| `csv-export` | Pass | Pass | Download contained the expected header and one row per three sample changes. |
| `json-backup` | Pass | Pass | Parsed backup contained one client, one project, and three changes. |
| `print-pdf` | Pass | Pass | Chromium produced a non-empty A4 PDF beginning with `%PDF`. |
| `offline-reload` | Pass | Pass | A dedicated context reloaded the three-card demo offline under the active service worker. |
| `private-local` | Pass | Pass | The claim flow produced only same-origin requests; no approval fragment or entered change text appeared in request URLs. |
| `free-ledger` | Pass | **Incomplete** | Tagged command checks the paywall, price, and link, but not a successful paid unlock or unlimited-ledger result. |

All nine claim IDs occur exactly once as `@claim:<id>` tags. No extra unlisted landing or README capability was found after grouping the fingerprint/receipt text with `approval-receipt` and the local/no-tracking text with `private-local`; the two grouped claims remain incomplete as described above.

## Candidate and deployment identity

The implementation checkout was detached at `9f78058218abd11cadde6872b8b065d5558af474`. Only `.factory/handoff.md` changed in documentation commit `70022120cd1563ad75843057c5830a0edbcfa29b`; the later `d2eadbe012a51eecf41b0c42fde8349bb5f3bac8` commit changes Graphify output only.

Fresh SHA-256 comparisons matched the candidate build to production for `index.html`, emitted JavaScript and CSS, `sw.js`, `manifest.webmanifest`, privacy, terms, 404, robots, and sitemap. The live runtime is the implementation candidate.

## Live job, audience, and first action

Before scrolling in fresh browsers:

- Job: **Approve scope changes before extra work.**
- Audience: **Solo service freelancers who need clients to approve fixed-price changes before extra work begins.**
- First action: **Try it with sample data.** The adjacent sentence says the sample opens a realistic client ledger and nothing is saved to real data.

The sample action was inside the initial viewport at 1440 × 900 (`y 697.7`, height `46.8`) and 390 × 844 (`y 705.2`, height `46.8`). The three privacy/offline/price facts also appear on the first screen.

## Live functional evidence

- The sample showed the `Autumn collection website` for Mira Patel with three realistic changes: approved, awaiting decision, and declined. Totals were $4,800 base, $420 approved, $5,220 current, and $650 pending.
- The demo banner survived reload. Adding a fourth demo change survived reload. Reset restored exactly the three shipped changes. Start for real removed the demo banner and returned to the untouched real ledger with no sample-only record.
- Required fields, malformed email, and a base quote below zero kept the dialog open with native recovery messages. Zero was accepted as the minimum base quote, and a negative scope delta was accepted as a valid reduction.
- A real ledger survived reload. Work could not be marked done before approval. The approval link contained a fragment and visible SHA-256 fingerprint. Changed link content was rejected. A matching client receipt imported as Approved and then allowed Mark work done.
- An invalid JSON backup showed `This backup format is not supported.` Canceling change deletion preserved the record. The full local browser suite also passed valid restore, JSON receipt import, and stale-receipt recovery.
- A dummy invalid license produced `This license is not active (invalid).` without console errors. The checkout endpoint returned HTTP 303 to hosted checkout, so the previously noted billing-registration dependency is now resolved.

## Accessibility, mobile, routes, and privacy

- `/opt/fleet/lib/verify-url.sh` passed in 647 ms: HTTP 200, title, `lang=en`, one H1, main landmark, image alt, labelled buttons, and no browser errors.
- Full axe scans found zero violations of any severity on home, demo, privacy, terms, client approval, and the designed 404.
- At 390 px, there was no normal horizontal overflow and no visible interactive target below 44 × 44 px. At 200% text size, the job heading and export control remained visible and all navigation remained reachable; the header required horizontal scrolling.
- Keyboard-only navigation reached the skip link first with a 3 px blue focus ring, reached the real-ledger action, opened its named dialog with focus inside, and closed it with Escape. Reduced motion produced `scroll-behavior: auto` and zero transition/animation duration.
- Privacy and terms returned 200 with route-specific titles, one H1, header/main/footer, and skip links. An unknown address returned the styled `Page not found — Change Ledger` page with deliberate HTTP 404. Its expected browser 404 resource message is not a defect.
- A complete live owner/demo/client flow made 26 requests, all to the product origin. No request URL contained an approval/receipt fragment, client name, or entered change title. License verification sent only the entered dummy token to the documented Sociobot endpoint.
- The service worker controlled the live demo. After switching a dedicated fresh context offline and reloading, all three cards and the offline notice remained available. No false update toast appeared on first install; the candidate contains the versioned update notification path.

This is a static PWA without a product backend, tenant model, or server-side product state. Backend restart persistence, tenant isolation, health, and 429 checks are therefore not applicable. The external Sociobot billing API is outside this product's backend scope.

## Performance and delivery

- Production build: JavaScript 41.46 KB raw / 12.50 KB gzip; CSS 17.16 KB raw / 4.79 KB gzip.
- Fresh live Lighthouse mobile profile: performance 98, accessibility 100, best practices 100, SEO 100; LCP 1.6 s, CLS 0.091, TBT 0 ms, FCP 0.9 s.
- Home and app-shell HTML use no-cache. Hashed assets use `public, max-age=31536000, immutable`. CSP, Permissions Policy, referrer policy, `nosniff`, and HSTS are present.
- Home, demo, privacy, terms, robots, sitemap, manifest, social image, and external contact links returned expected success/redirect responses.

## Earlier finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| Missing claims manifest and claim tests | Partly fixed: nine tagged commands exist and run, but two remain incomplete (findings 1–2). |
| No isolated one-click demo | Fixed and independently exercised, including persistence, reset, and return to real data. |
| First screen omitted audience and sample action | Fixed in the loaded app on desktop and phone. The separate loading-copy issue is finding 3. |
| Invalid backup lacked recovery | Fixed; live error and valid local restore passed. |
| Stale receipt was reported as a storage failure | Fixed; local browser test gives the earlier-revision cause and next action. |
| Mobile targets below 44 px | Fixed; no undersized visible control at 390 px. |
| Missing copy audit, host config, robots, sitemap, designed 404, CSP, and cache policy | Fixed, except the copy audit omits the loading-state wording in finding 3. |
| Missing/weak security and immutable-cache headers | Fixed on the live deployment. |

## Commands and evidence

Clean-checkout commands:

```text
npm ci                                      PASS, 0 vulnerabilities
npm test                                    PASS, 6/6
npm run build                               PASS, dist/ produced
npm run test:e2e                            PASS, 15 passed / 15 expected skips
npm run test:claims                         PASS, 9 passed / 9 expected skips
npm run test:e2e -- --grep @claim:<id>      PASS individually for all nine IDs
```

Live evidence:

- `/work/.evidence/svb-verify2-url/verify.json`
- `/work/.evidence/svb-verify2-lighthouse.json`
- `/work/.evidence/svb-verify2-desktop-home.png`
- `/work/.evidence/svb-verify2-mobile-home.png`
- `/work/.evidence/svb-verify2-mobile-demo.png`

## Required changes before PASS

1. Make the single `@claim:approval-receipt` test reject a nonmatching or stale receipt as well as accept a matching one.
2. Make the single `@claim:free-ledger` test use a recorded valid verification response and prove a second active ledger can be created; cover invalid/revoked recovery as part of the paid path.
3. Replace the initial `Surveying local records` / product-name H1 with direct job/loading copy and add the loading state to `.factory/copy-audit.md`.
