# Change Ledger

Change Ledger helps solo service freelancers get a clear client decision on fixed-price scope changes before extra work begins.

Try the isolated sample at <https://scope-variation-board.sociobot.in/demo>. It opens a populated client ledger in one click and never changes real data.

## What it does

- Keeps clients, base quotes, scope changes, frozen approval links, and decision receipts in this browser.
- Records a client decision only when the receipt matches the frozen change revision.
- Exports the selected ledger as CSV and the complete workspace as JSON.
- Prints a populated ledger through the browser print dialog for PDF saving.
- Works offline after the first visit.
- Includes one active ledger free. A $19 one-time license unlocks unlimited active ledgers through the Sociobot billing API.

Change Ledger is a workflow record. It is not an electronic-signature service and does not make legal-enforceability claims.

## Privacy and limits

Client data stays in IndexedDB in this browser. There is no account system, analytics, cloud database, third-party font, or runtime CDN. Approval and return records are carried in URL fragments, so the hosting server does not receive their contents. Anyone with a full approval link can read that frozen record.

Use JSON backups for important records. Browser site-data clearing removes local records. A SHA-256 fingerprint detects changed link or receipt content; it does not prove a person's identity.

## Demo

`/demo` and `?demo=1` use a separate IndexedDB key, `demo:workspace`. The normal workspace uses `workspace`. The demo contains a ceramics-studio website with approved, pending, and declined changes. **Reset demo** restores only that sample. **Start for real** discards the sample key and returns to the normal workspace.

See [.factory/demo.md](.factory/demo.md) for the full demo contract.

## Run locally

Requirements: Node.js 22+ and npm.

```bash
npm ci
npm run dev
```

Open the URL Vite prints. Visit `/demo` to start with sample data.

## Test and build

```bash
npm test          # unit tests for hashes, receipts, backup parsing, and exports
npm run build     # type-check and create ./dist
npm run test:e2e  # browser workflows, claims, axe, mobile, and offline checks
npm run test:claims # every public claim from the isolated demo
npm run check     # unit tests, build, and browser checks
```

Every public claim and its exact command is listed in [.factory/claims.json](.factory/claims.json). The factory deploys `dist/`; `dist/index.html` is the application entry point. `staticwebapp.config.json` is copied to `dist/` during the build for routing, security headers, and static-asset caching.

## Deploy

Publish `dist/` as a static app. The production billing endpoint is `https://api.sociobot.in`; staging can use the factory's pilot billing base at build time:

```bash
VITE_BILLING_BASE=https://pilot-api.sociobot.in npm run build
```

The $19 license purchase depends on factory billing registration. The free core, exports, accessibility, and privacy controls work without it.

## License

MIT. See [LICENSE](LICENSE).
