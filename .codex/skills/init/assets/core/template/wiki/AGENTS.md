# Wiki instructions

This wiki is persistent project memory maintained by agents.

## Storage

- `inbox/` holds new sources, facts, decisions, research, and agent-written analysis awaiting integration.
- `sources/` holds immutable source material. Preserve source wording and provenance.
- `pages/` holds maintained synthesis. Update existing pages when new evidence changes them.
- `index.md` catalogs maintained pages. `log.md` records wiki operations chronologically.
- `_system/modules/` contains instructions for enabled project domains. Read a module when the current work matches it.

Human-facing documentation, code, generated output, and ordinary project configuration stay in their conventional project locations.

## Operations

Before using project memory, read `index.md`, then the relevant pages and cited sources.

For ingestion, preserve the input in `sources/`, integrate its claims into relevant pages, record contradictions and uncertainty, add useful links, update `index.md`, and append an ingest entry to `log.md`. Remove the inbox copy only after every durable claim has a maintained home and provenance.

For questions, answer from maintained pages and verify important claims against sources. File durable new analysis in `inbox/` or integrate it into existing pages when the evidence and destination are clear.

For decisions, record the decision, date, owner when known, evidence, rejected alternatives, consequences, and reversal conditions.

Periodically inspect the wiki for stale claims, contradictions, orphan pages, missing links, and unresolved inbox material. Record the lint pass in `log.md`.
