# Farls da bag

League history for the Farls da bag Sleeper league: careers that follow people through account changes, franchise histories, all-time records, rivalries and player contributions.

This repo currently holds the history engine only. It imports every linked Sleeper season into one durable JSON archive and calculates records from it. The first museum UI and its planning documents were removed and are kept in tag `v0-archive`.

## Run

Use Node.js 24.

```sh
npm ci
cp .env.example .env
npm run refresh
npm test
```

`npm run refresh` writes the archive to `MUSEUM_STORE_PATH`. `npm test` runs the engine tests against controlled provider fixtures, with no network.

## Docs

- [GLOSSARY.md](GLOSSARY.md): domain vocabulary.
- [docs/metrics.md](docs/metrics.md): record eligibility, ranking and attribution rules.
- [docs/coverage.md](docs/coverage.md) and [docs/sleeper-formats.md](docs/sleeper-formats.md): what the Sleeper source provides.
- [docs/operations.md](docs/operations.md) and [ADR 0001](docs/adr/0001-local-node-delivery.md): refresh, publication and the current hosting plan.

Project-authored code and documentation use the [MIT license](LICENSE). Artwork, source data and dependencies keep the rights described in [third-party notices](THIRD_PARTY_NOTICES.md).
