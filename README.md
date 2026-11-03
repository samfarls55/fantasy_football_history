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

The selected production arrangement is the standalone Node server (`npm start` after building), a durable atomic JSON archive and a daily systemd refresh. See [operations](docs/operations.md) for configuration, the local publication proof, deployment examples and recovery, and [ADR 0001](docs/adr/0001-local-node-delivery.md) for the decision. No host or scheduled service has been provisioned.

## Browser checks

The Playwright configuration uses an installed Google Chrome browser. Run `npm test` to check scope filters, evidence links, browser history, keyboard focus, copying links, missing images, and responsive layouts. The tests start a development server when needed.

Set `MUSEUM_BASE_URL` to test an already running preview instead. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to use an installed Chromium binary in place of Google Chrome. `npm test` also runs publication/recovery checks through the real operator commands.

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

Sam confirmed the complete written design handoff at Q44 on November 3, 2026. The public repository and GitHub Issues are configured at [samfarls55/fantasy_football_history](https://github.com/samfarls55/fantasy_football_history), with shared agent configuration in AGENTS.md and docs/agents/. Spec #1 and its child tickets are published. Delivery choices are recorded in ADR 0001; the provider importer and public history routes are subsequent implementation slices.

Project-authored code and documentation use the [MIT license](LICENSE). Artwork, source data, fonts and dependencies retain the rights and notices described in [third-party notices](THIRD_PARTY_NOTICES.md).
