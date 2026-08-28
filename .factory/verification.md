# Independent verification — FAIL

- **Candidate:** `b67d6bdd1a9364d8140e3ec44eaf4dee044b9253` (`b67d6bd`)
- **Live URL:** <https://scope-variation-board.sociobot.in>
- **Verified:** 2026-08-28 (UTC)
- **Result:** **FAIL — release blocked**

The deployment is the candidate: fresh SHA-256 comparisons matched `dist/index.html`, emitted JS/CSS, `sw.js`, manifest, privacy page and terms page to their live counterparts. This is not a stale-deployment failure.

## Release blockers

1. **[BLOCKER] Required claims contract is missing.** `.factory/claims.json` does not exist in this clean candidate, so there were no declared claim tests to execute from the demo entry point. This violates the mandatory claims contract by itself. The live page and README make testable claims including local-only storage/no cloud upload, offline use after first load, CSV export, JSON backup/export, and privacy/no analytics; none have the required listed sandbox test.

2. **[BLOCKER] There is no one-click, isolated sample-data demo.** On a fresh cold live visit, the only product action is `Create your first ledger`; `Try it with sample data` has zero matches. `/demo` merely serves the normal empty app, and `?demo=1` also serves the normal empty app. Neither has sample data nor the mandatory `Demo — sample data, nothing is saved`, `Reset demo`, and `Start for real` controls. `.factory/demo.md` is also absent. This independently fails the required first-read/demo-sandbox acceptance gate.

## First-read result

Cold live page, desktop and 390 px, read after network idle:

- **What it does:** inferable only after reading the metaphor-heavy copy: it records scope changes and approval links.
- **For whom:** not stated on the first screen; neither `freelancer` nor the brief's solo service freelancer is present.
- **What to click first:** `Create your first ledger` is available, but no required sample-data action or explanation of the resulting sample exists.

The headline is `Approve the detour before you do the work.` It is not a plain-words job statement. The first screen therefore fails the explicit what/who/first-click test as well as the required demo action.

## High-severity defects

1. **[HIGH] JSON import/restore recovery is nonfunctional in the live app.** From a fresh live workspace, create a ledger → `Import or back up data` → set `#backup-file` to an invalid `{}` JSON file. After one second the selected file count is `1`, `#data-error` remains empty, and the only toast is the earlier ledger-save toast. Dispatching `change` again has the same result. The promised invalid-input recovery is absent, and this also leaves the documented JSON backup and receipt-import fallback unproven/unusable.

2. **[HIGH] PWA/site documentation and discoverability deliverables are missing.** The candidate lacks `.factory/demo.md`, `.factory/copy-audit.md`, `staticwebapp.config.json`, `robots.txt`, and `sitemap.xml`. `/robots.txt` and `/sitemap.xml` return 404, while an unknown route returns the application shell rather than a designed 404.

## Medium-severity defects

1. **[MEDIUM] Touch targets violate the 44 px minimum on the populated 390 px screen.** Measured controls include all six filter buttons at 43 px tall and `View approval link`, `Edit`, and `Delete` at 40 px tall. Footer and inline links are also below 44 px. This fails the stated mobile/accessibility baseline, although axe reports no serious/critical violation.

2. **[MEDIUM] Stale receipt recovery is misleading.** Returning a valid receipt after revising the change yields `Change Ledger could not open` / `Local storage error` and tells the owner to allow site storage or leave private browsing. The actual, correctly detected reason is `This receipt is for an earlier revision of the change.` The user is not given the appropriate recovery step (create/import a current decision).

3. **[MEDIUM] Deployment response policy/caching is incomplete.** The live HTML, hashed JS/CSS, service worker, and manifest all use `Cache-Control: public, must-revalidate, max-age=30`; hashed assets are not immutable/long-lived. `Content-Security-Policy` and `Permissions-Policy` are absent. HSTS, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Content-Type-Options: nosniff` are present.

## Checks that passed

### Local clean checkout

```text
npm ci                    PASS (0 vulnerabilities reported)
npm test                  PASS (6/6)
npm run build             PASS (type check + Vite build; dist/ produced)
npm run test:e2e          PASS (5 passed, 3 intentional project skips)
```

Build output: JS 36.37 kB raw / 11.10 kB gzip and CSS 15.62 kB raw / 4.49 kB gzip, both within the static-product budgets. The hero is 69 kB WebP.

### Live functional and resilience QA

- Owner → client approval → returned receipt → mark work done passed.
- Declined receipt import, frozen link SHA-256 tamper rejection, revision invalidation, persistence after reload, CSV export (header + one data row), and JSON backup download passed.
- Native required/email/minimum-value validation kept the dialog open and gave browser validation messages.
- Offline reload after service-worker control preserved the populated ledger and approval page. The active worker is `/sw.js`; manifest, 192/512 maskable icons, standalone display, and update toast on worker activation were observed.
- Keyboard-only smoke test passed: Tab reaches the skip link, brand, new-ledger control, and first action with a visible `rgb(0, 107, 143) solid 3px` outline; Space opens the dialog and Escape closes it. Reduced motion reports `scroll-behavior: auto`, zero transition duration and zero animation duration.
- 390 px layout did not horizontally overflow, and 200% text retained the heading and CSV control.
- Axe (empty, populated desktop, populated mobile, client approval, privacy, terms): no serious or critical findings. `/opt/fleet/lib/verify-url.sh` passed: HTTP 200, title/lang/main, one h1, image alt, no unlabeled buttons, no browser errors; network-idle load was 705 ms.
- Fresh Lighthouse against live: performance 98, accessibility 100, best practices 100, SEO 100; LCP 1.7 s, CLS 0.091, TBT 0 ms.
- During the complete normal owner/client flow, 34 browser requests were same-origin and no request URL contained an approval or receipt fragment. No console or page errors were observed.

### Endpoint and browser policy QA

- No sign-in is required.
- License verification CORS preflight permits the product origin and expected methods. An invalid token returns JSON with `Cache-Control: no-store`.
- Required rate-limit burst passed: against `GET https://api.sociobot.in/api/v1/products/scope-variation-board/verify?license=qa-invalid-token`, requests 1–29 returned 200; request 30 first returned **429** with `Retry-After: 3` (requests 30–40 remained 429, later `Retry-After: 2`).

## Evidence commands

```bash
npm ci && npm test && npm run build && npm run test:e2e
/opt/fleet/lib/verify-url.sh https://scope-variation-board.sociobot.in /tmp/svb-verify-url
node .factory/live-qa.mjs
curl -I https://scope-variation-board.sociobot.in/
curl -I https://scope-variation-board.sociobot.in/assets/index-B9htDJOS.js
```

Fresh runtime evidence was captured in `/tmp/svb-live-qa.json`, `/tmp/svb-verify-url/verify.json`, and `/tmp/svb-lighthouse.json` during this verification. The checked-in report contains the exact relevant outcomes above.

## Required remediation before re-verification

1. Add a complete `.factory/claims.json` and one executable tagged sandbox test per every user-facing claim; run each through a demo-only entry point.
2. Add the one-click realistic demo, `?demo=1` or `/demo` direct entry, separate `demo:` storage namespace, persistent sample-data banner/reset/start-real controls, and `.factory/demo.md`.
3. Repair file import event/error handling and add end-to-end coverage for valid/invalid JSON backup and receipt import; make stale-receipt recovery accurately explain the next action.
4. Meet all 44 px touch targets and add the missing site/PWA delivery files, proper 404, CSP, and immutable asset-cache configuration.
