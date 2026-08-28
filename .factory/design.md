# Change Ledger visual thesis

## Direction: topographic cartography

Scope changes are detours across terrain: they alter the route, elevation and cost of an agreed journey. Change Ledger uses the visual language of a field map—contour lines, survey marks, coordinates and inked annotations—to make each variation feel located, bounded and auditable. It is not a faux-paper theme. The working surface stays quiet and precise; cartographic detail appears at orientation points, empty states and the frozen approval artifact where it explains the product.

The interface is intentionally single-mode and light, like a survey sheet in daylight. This maximises legibility for quotes and printed receipts and avoids presenting two visually different versions of the same evidence artifact.

## Palette

| Token | Value | Role |
| --- | --- | --- |
| `--paper` | `#F2EFE4` | warm map-sheet background |
| `--sheet` | `#FFFCF4` | working surfaces |
| `--ink` | `#17241F` | primary copy, 13.7:1 on paper |
| `--muted` | `#53635B` | secondary copy, 5.8:1 on paper |
| `--line` | `#B8B8A8` | boundaries (never sole status cue) |
| `--pine` | `#174D3A` | primary action and survey marks |
| `--pine-deep` | `#0E382A` | pressed/hover action |
| `--route` | `#A84322` | scope delta and warning route |
| `--approved` | `#216447` | approved state with check label |
| `--pending` | `#8A5A12` | pending state with clock label |
| `--declined` | `#8F2F2B` | declined/error state with cross label |
| `--focus` | `#006B8F` | 3 px keyboard focus ring |

No gradients. Fine contour lines use pine at 8–12% opacity and never sit directly behind long-form body copy.

## Typography

- Headings and map labels: **Georgia**, a system serif with compact authority and print reliability.
- Interface, forms and figures: **Arial / system sans**, chosen to keep the PWA small and familiar under deadline pressure. Figures use `font-variant-numeric: tabular-nums`.
- Scale: 16 px body, 18 px lead, 20 px card title, 28 px section title, clamp(36–58 px) product h1. Body line height 1.55; text measure at most 68 characters.

No font files or third-party calls ship. The contrast between a surveyor's serif annotations and pragmatic sans-serif controls is the pairing.

## Spacing and layout

An 8 px field-grid governs space: 4, 8, 12, 16, 24, 32, 48 and 64 px. The desktop ledger is a 280 px project rail beside a fluid map sheet. At 760 px the rail becomes a horizontal project selector and forms stack. At 390 px supporting coordinates and nonessential texture recede; actions remain full-width or in two equal columns. Controls are at least 44 px tall, with 8 px between targets.

Cards are reserved for independent change records. Client/project metadata is grouped by proximity and field rules rather than nested cards. Corners are modest (2–12 px), evoking cut paper rather than a generic rounded dashboard.

## Interaction grammar

- **Plot:** creating a change adds a numbered survey marker to the ledger.
- **Freeze:** generating a client link snapshots the exact card, prints a SHA-256 fingerprint and changes its state to awaiting decision. Later edits produce a new revision and hash; they do not rewrite the prior snapshot.
- **Return:** receipt imports match project, change, revision and hash before applying a decision.
- **Traverse:** status filters behave like map legends; labels and symbols always accompany colour.
- **Complete:** work can only be marked done after approval. The UI explains why instead of silently allowing the bypass.

Destructive deletion requires a named confirmation. Status and save feedback appears in a polite live region.

## Motion policy

New records enter from their marker origin with a 180 ms opacity/translate transition. Dialogs scale from 98% over 160 ms; status changes briefly draw an ochre inset route. Nothing loops. With `prefers-reduced-motion: reduce`, all transforms, smooth scrolling and transitions are removed; state remains apparent through position, icon and text.

## Asset plan and provenance

### Generated hero: `public/assets/contour-ledger.webp`

- Purpose: compact onboarding/empty-state illustration that establishes “changed route across known terrain,” not decorative filler.
- Use case: `stylized-concept`.
- Prompt: “A tactile topographic relief map built from hand-cut layers of warm ivory paper on a dark pine-green surveyor's table. A single burnt-ochre route line travels across the contours, reaches a precise brass survey pin, then visibly diverts along a newly plotted branch. Small blank cream ledger cards and a wooden ruler sit at the edge, no writing. Oblique three-quarter overhead composition, generous calm negative space, crisp paper fibers, restrained editorial still life, soft northern-window light, deep forest green, bone, ochre and graphite palette. Product illustration for an offline scope-change ledger. No people, no hands, no text, no letters, no numbers, no logos, no watermark, no UI screenshot, no gradients.”
- Generator: Azure AI Foundry factory image deployment via `/opt/fleet/lib/gen-image.sh`.
- Date: 2026-08-28.
- License/provenance: original generated asset for this product; prompt and source PNG are retained in `assets/src/`.
- Review checklist: reject accidental text, logo-like marks, broken objects, incoherent contour seams or colors outside the product palette.

### Hand-authored assets

The compass/contour brand mark, status glyphs, PWA icons and interface symbols are original SVG/CSS geometry authored in this repository. They use the same contour spacing and survey-marker motif. No stock libraries or third-party icon sets are used.

## Print and evidence artifact

PDF export uses the browser's print-to-PDF path so it works offline without a heavy dependency. Print removes navigation and controls, expands the selected ledger into an A4-friendly sheet, preserves hashes/timestamps, and includes the disclaimer: “Workflow record, not an electronic signature or legal opinion.”
