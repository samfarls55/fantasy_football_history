# ADR 0003: Archive version 2, without raw responses

Status: accepted, November 24, 2026. Implements the archive decisions in [issue #37](https://github.com/samfarls55/fantasy_football_history/issues/37).

Version 1 archives kept every raw Sleeper response for replay. No read used them, and they were 16.7 MB of the reference league's 20.3 MB. Each page request parsed that file twice: once to check its age and once to read it.

Version 2 drops the raw responses. Transactions, drafts and picks keep their source fields, which the draft, keeper, trade and clock rules need. Players gain college and birth date, validated at import, and either may be unknown. The reference archive is 3.6 MB.

A version 1 archive counts as missing, so a league imports again on its next visit. Archives are derived from Sleeper, so nothing is migrated.

`ensureLeague` returns the archive it checked or imported, and the page passes it to `withHistorySnapshot`. A request parses the archive at most once, even when it refreshes the league. Concurrent visits that share an import share its archive object, so reads must never change the archive.
