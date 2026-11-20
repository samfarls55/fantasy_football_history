# Fantasy football history

Enter a Sleeper username, pick a league and see its whole history: champions, records, careers and head-to-head streaks. See [PRODUCT.md](PRODUCT.md).

## Run

Use Node.js 24.

```sh
npm ci
npm run dev
```

Open the printed local URL and enter a Sleeper username. A league imports on its first visit, in about 3 seconds, into `data/leagues/<league id>.json`.

Production runs on Vercel at https://rafters-ff.vercel.app, deployed with `vercel deploy --prod`. Vercel has no persistent disk, so `HISTORY_DATA_PATH=/tmp/data` there and a fresh instance reimports a league on its first visit.

`npm test` runs the engine tests against controlled Sleeper fixtures, with no network. `npm run refresh` imports the league in `SLEEPER_LEAGUE_ID` into `MUSEUM_STORE_PATH` from the command line.

## Docs

- [PRODUCT.md](PRODUCT.md): what this is and what's in scope.
- [GLOSSARY.md](GLOSSARY.md): domain vocabulary.
- [docs/metrics.md](docs/metrics.md): record eligibility, ranking and attribution rules.
- [docs/coverage.md](docs/coverage.md) and [docs/sleeper-formats.md](docs/sleeper-formats.md): what Sleeper provides.
- [ADR 0002](docs/adr/0002-on-demand-league-imports.md): on-demand imports and the per-league archive.

Project-authored code and documentation use the [MIT license](LICENSE). Artwork, source data and dependencies keep the rights described in [third-party notices](THIRD_PARTY_NOTICES.md).
