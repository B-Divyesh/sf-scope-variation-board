# Change Ledger demo

Open <https://scope-variation-board.sociobot.in/demo> or add `?demo=1` to the home URL. The landing page also has a one-click **Try it with sample data** action.

The demo contains a realistic ceramics-studio website ledger for Mira Patel. It includes three fixed-price changes: one approved, one waiting for a decision, and one declined. It shows a base quote, decision receipts, fingerprints, totals, filters, exports, printing, and the same approval flow used in a real ledger.

Demo data is stored under the IndexedDB key `demo:workspace`. Real data uses `workspace`. Demo mode only reads and writes `demo:workspace`; it does not read or write the real workspace. **Reset demo** replaces only the demo key with the shipped sample. **Start for real** removes the demo key and returns to the real workspace.

The claim suite uses `/?demo=1` from a fresh browser context. Run every documented claim with `npm run test:claims`, or run an individual command from `.factory/claims.json`.
