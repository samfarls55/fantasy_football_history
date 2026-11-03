# Farls da bag

A responsive league-history home page built with Astro and TypeScript. The gallery leads into a record index and shareable evidence views.

## Run locally

Use Node.js 24, the version used to check this build.

```sh
npm ci
npm run dev
```

Open the local URL printed by Astro. To check the production build:

```sh
npm run check
npm run build
npm run preview
```

## Browser checks

The Playwright configuration uses an installed Google Chrome browser. Run `npm test` to check scope filters, evidence links, browser history, keyboard focus, copying links, missing images, and responsive layouts. The tests start a development server when needed.

Set `MUSEUM_BASE_URL` to test an already running preview instead.

## Current data

Statistics are synthetic examples in `assets/data/sample-history.ts`. The page labels them as sample stats, and the evidence views include calculations, eligibility, and the source fixture. The Sleeper importer is not connected.

Current team names and images came from the configured league's Sleeper users endpoint. They do not establish historical names, player identity, or championships. Image origins are embedded in the PNG assets. Fonts are self-hosted, with their licenses in `public/fonts`.

The running prototype's inline evidence behavior is historical. The approved full-platform direction removes public calculation/source panels and update-status UI, and uses category rankings followed by actual historical destinations. Application code has not been changed during the design walkthrough.

## Full-platform handoff

- [SPEC.md](SPEC.md) defines the reconciled scope and application-boundary testing requirements.
- [DESIGN-BRIEF.md](DESIGN-BRIEF.md) defines page contracts, responsive behavior and all selected visual references.
- [DESIGN.md](DESIGN.md) records the existing visual tokens; [PRODUCT.md](PRODUCT.md) records current product context.
- [docs/metrics.md](docs/metrics.md) defines internal record and contribution rules.
- [docs/requirements.md](docs/requirements.md) accounts for all original stories and walkthrough additions.
- [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md) supplies local tickets and blocking relationships for implement-spec.

Sam confirmed the complete written design handoff at Q44 on November 3, 2026. Repository/tracker, hosting, persistence, refresh scheduling and license setup remain implementation tasks; no full-platform implementation or issue publication has started.
