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

Enter a Sleeper username, pick a league, see its history. Read PRODUCT.md first, then ADR 0002 for how imports work. `src/history/` is the engine; `src/pages/` is the site. Tag `v0-archive` keeps the first single-league museum UI and its planning documents.

## Commands

- `npm run dev` serves the site locally; league pages import on first visit.
- `npm run refresh` imports `SLEEPER_LEAGUE_ID` into `MUSEUM_STORE_PATH` from the command line.
- `npm test` runs the engine tests against controlled provider fixtures, with no network.

## Development scratch

Put disposable agent scripts, notes, screenshots, and output in `.scratch/`.
