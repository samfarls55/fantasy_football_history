## Agent skills

### Issue tracker

Use GitHub Issues for samfarls55/fantasy_football_history.
Before issue operations, read docs/agents/issue-tracker.md.

### Triage labels

Use the five default triage labels.
Before triage or labeling, read docs/agents/triage-labels.md.

### Domain docs

Use a single-context layout.
Before domain exploration or changes, read docs/agents/domain.md.

## Status

The repo holds only the history engine: Sleeper import, identity and ownership resolution, record calculations and the durable archive. The previous museum UI and its planning documents were removed; tag `v0-archive` keeps them. Build new pages from real archive data.

## Commands

- `npm run refresh` imports the configured league into `MUSEUM_STORE_PATH`.
- `npm test` runs the engine tests against controlled provider fixtures, with no network.

## Development scratch

Put disposable agent scripts, notes, screenshots, and output in `.scratch/`.
