# Change Ledger

Change Ledger is a local-first scope-variation board for solo service freelancers. It turns an out-of-scope request into a frozen, client-readable approval link, then verifies the returned decision against the exact revision before the related work can be marked done.

Live product: <https://scope-variation-board.sociobot.in>

## What it does

- Keeps client ledgers, base quotes and line-item scope changes in IndexedDB.
- Creates shareable approval links whose contents stay in the URL fragment and are not sent to the host.
- Adds SHA-256 fingerprints to frozen changes and client decision receipts.
- Accepts an approval or decline through a return link or imported JSON receipt.
- Preserves prior revision receipts while requiring a fresh decision after an edit.
- Exports a project to CSV, the full workspace to JSON, and print-ready PDF through the browser print dialog.
- Works after the first load without a network connection.
- Includes one active ledger free; a $19 one-time license unlocks unlimited active ledgers through the Sociobot billing API.

Change Ledger is a workflow record, not an electronic-signature service or a claim of legal enforceability.

## Run locally

Requirements: Node.js 22+ and npm.

```bash
npm ci
npm run dev
```

Open the URL Vite prints. Browser data is local to that origin, so development and production have separate workspaces.

## Test and build

```bash
npm test          # unit tests for hashes, receipts and exports
npm run build     # type-check and create ./dist
npm run test:e2e # Playwright workflow, axe, mobile and offline checks
npm run check     # all of the above
```

The factory build command is exactly `npm run build`. Static deployment must publish `dist/`; `dist/index.html` is the entry point. Playwright is pinned to 1.58.2 as required by the worker image.

To use the billing test environment during staging:

```bash
VITE_BILLING_BASE=https://pilot-api.sociobot.in npm run build
```

Production defaults to `https://api.sociobot.in`. The product slug is used in the documented checkout and verify routes; there is no embedded payment-provider SDK or product ID.

## How the private approval handoff works

1. The freelancer creates a client ledger and a change card.
2. “Create approval link” freezes the project summary and current change revision, canonicalizes it, and adds a SHA-256 fingerprint.
3. The payload travels in the link's URL fragment. It does not enter server request logs.
4. The client opens the static app, verifies the automatic fingerprint check, and chooses approve or decline.
5. The client returns a fragment link or downloads a JSON receipt. The receipt has its own fingerprint.
6. The freelancer's browser accepts it only when project, change, revision, payload hash and receipt hash match.

The link is intentionally self-contained and can become long. Treat approval and return links as private business records.

## Privacy, accessibility and assets

There is no analytics, account database, CDN, third-party font or runtime script. Clearing browser site data removes the workspace; use JSON backups for portability. The service worker precaches the app shell and uses cache-first assets with a network-first license check.

The UI has semantic landmarks, one page-level heading, labelled forms, native focus-managed dialogs, visible focus rings, ≥44 px targets, reduced-motion handling and responsive behavior down to 390 px. The generated topographic illustration and its prompt/provenance live in `assets/src/`; the visual system is documented in `.factory/design.md`.

See [privacy](public/privacy/index.html) and [terms](public/terms/index.html).

## License

MIT. See [LICENSE](LICENSE).
