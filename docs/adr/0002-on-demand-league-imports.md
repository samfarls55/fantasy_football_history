# ADR 0002: On-demand league imports with a per-league archive

Status: accepted, November 19, 2026. Supersedes [ADR 0001](0001-local-node-delivery.md). Its storage part is superseded by [ADR 0004](0004-shared-archives-on-vercel-blob.md).

The product changed from one configured league per deployment to any Sleeper league: a visitor enters a Sleeper username, picks one of that user's leagues and sees its history. There is no scheduled refresh and no host yet.

Keep Astro SSR on the standalone Node adapter, because league pages import data on request. Each league's history is one archive file at `data/leagues/<league id>.json`, written with the existing atomic publication. A league imports on its first visit and again when its archive is older than 12 hours. Concurrent visits share one import. A failed refresh keeps showing the previous archive; a failed first import shows an error.

Imports use `sleeperImportProvider`, which starts every predictable request for each linked season as soon as its league loads, ten at a time, so a full eight-season import takes about 3 seconds instead of 43. The Sleeper player list (14 MB) is cached on disk for a day at `data/players-nfl.json`, as Sleeper asks.

`HISTORY_DATA_PATH` moves the data directory. Production runs on Vercel, which has no persistent disk: `HISTORY_DATA_PATH=/tmp/data` keeps archives per function instance, so a cold instance reimports a league on its first visit. A shared store such as Vercel Blob would remove those reimports.
