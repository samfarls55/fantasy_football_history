# Operating one league museum

The selected delivery is Astro/TypeScript SSR on Node.js 24 or newer, a durable local JSON archive and a daily systemd refresh. The repository contains runnable local publication tooling and installation examples. No external account, server, domain, service or timer has been provisioned or enabled.

## Local commands and configuration

Set the configured league and durable archive path in `.env` before the first refresh. Complete a successful refresh and inspect its publication before serving visitors.

```sh
npm ci
cp .env.example .env
npm run check
npm test
npm run refresh
npm run history:inspect
npm run build
npm start
```

Use `npm run dev` for development. `npm start` serves the built standalone Node server. Development and production reads must call `loadArchive` at request time; importing JSON into a build would freeze the history. Server-only archive data must never be copied into a public source endpoint or client bundle.

Browser checks use an installed Google Chrome by default. For another installed Chromium binary, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its absolute path, for example `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test` on this Linux environment.

The operator owns `.env` locally and `/etc/farls-museum.env` in the systemd examples. Keep web and refresh processes on the same configuration:

| Variable | Ownership and meaning |
| --- | --- |
| `SLEEPER_LEAGUE_ID` | One league's seed ID as a string. Default deployment: `1385327861673529344`. The importer follows linked seasons from here. |
| `MUSEUM_STORE_PATH` | Writable archive path. Local default: `./data/history.json`, relative to the working directory. Production: `/var/lib/farls-museum/history.json`, outside the checkout and build output. |
| `HOST`, `PORT` | Standalone HTTP binding; example `127.0.0.1:4321`. A production reverse proxy supplies the public origin and TLS. |

The publication store reads its path from the runtime environment on every operation. The importer owns league configuration and all provider validation. Changing leagues requires a separate archive path; a mismatched publication is rejected. Do not commit real history or environment files.

## Locally demonstrated publication boundary

Operator commands run independently of Astro. The publication command also accepts a prepared canonical `Archive` JSON candidate:

```sh
npm run history:publish -- /absolute/path/to/candidate.json
npm run history:inspect
npm run test:publication
```

`publish` checks the archive envelope and atomically replaces the persisted publication. `inspect` reports whether a publication exists and, when present, its league, `importedAt`, season names, counts and coverage issues. Coverage includes the affected season, area, endpoint/roster/player detail and blocked record categories. These are operator-only diagnostics. Tests exercise these actual commands in separate processes against a temporary durable directory, demonstrate a later correction, and prove incomplete or malformed candidate failure retains the previous successful history. They do not inspect private files to assert success.

The real configured provider import is now available:

```sh
npm run refresh
```

It uses `SLEEPER_LEAGUE_ID`, follows every linked previous season, validates source responses at import, retains their string IDs and source settings, and publishes one coherent archive through the same atomic boundary. Repeating an import replaces results rather than appending them. Current-season completion requires both league scoring progress and a passed NFL-state week; numeric current-week scores alone cannot enter standings. Request failures and missing required team scores fail the run with an endpoint diagnostic and retain the last successful history.

Successful refreshes emit one JSON result with `changed`, `importedAt`, imported seasons/completed weeks, counts and coverage. `importedAt` is the collection-start timestamp stored with the published snapshot. A successful repeat with unchanged source history reports `changed: false` and advances that timestamp without duplicating results. Use `history:inspect` to inspect the durable publication after a process exits.

Each public request captures one persisted snapshot for all of its reads; the next request sees a newly published archive. Public routes use that history for standings, person/franchise profiles, records, season comparisons, rivalries, player contributions, move rankings and Home. Corrections require no frontend rebuild or server restart. Completed weekly legs can contribute player points while a multiweek contest remains unfinished; finalized wins and season awards still require their completion evidence. There is no public source endpoint or operational panel.

`npm run test:publication` includes controlled-provider import-to-public-read tests as well as the independent publication command tests. Browser checks run a real controlled import into a dedicated per-run `MUSEUM_STORE_PATH`, then exercise the SSR pages. They never replace the default archive. The browser-only fixture adds a long historical roster name and a controlled avatar response to check wrapping and image failure. All recurring checks run without live provider requests.

## Production installation arrangement

Use a Linux host with Node.js and npm available at the unit paths, `flock`, and a persistent local filesystem. Build the application with `npm ci && npm run build`, install the checkout at `/opt/farls-museum`, and create a dedicated `farls-museum` service user. Set `/etc/farls-museum.env` to the configuration above with an absolute production archive path. Both processes must run as the same user so they can read the mode-0600 archive. systemd's `StateDirectory=farls-museum` creates `/var/lib/farls-museum` for that user.

The units in `deploy/systemd/` are installation examples with fixed paths. Adapt them to the chosen host, install them in `/etc/systemd/system/`, and reload systemd. Initialize history through `systemctl start farls-museum-refresh.service`; require a successful exit and verify `published: true` with `history:inspect` under the same environment before enabling/starting `farls-museum.service` and `farls-museum-refresh.timer`. If the initial refresh fails, resolve the diagnostic and retry before serving visitors. Confirm the timer using `systemctl list-timers farls-museum-refresh.timer` and inspect failures using `journalctl -u farls-museum-refresh.service`. No deployment-specific timer activation has been verified without an available chosen host.

The timer requests a refresh daily at 10:00 UTC and catches up a missed run after boot. Live scoring is outside the requirement. Deployments preserve `/var/lib/farls-museum`; rebuilding or replacing `/opt/farls-museum` must not remove history. A reverse proxy/domain/TLS arrangement and its costs remain operator choices.

The refresh unit acquires `/var/lib/farls-museum/refresh.lock` for the whole run. systemd avoids overlapping activations of that unit; manual refreshes must use the same lock and configured environment:

```sh
flock --nonblock --conflict-exit-code 75 /var/lib/farls-museum/refresh.lock npm run refresh
```

Run that command as the service user from the configured working directory, with the shared environment loaded. Use the same guard for a manual `history:publish`. Exit 75 means another writer holds the lock; retry after it exits. The OS releases the lock when the process exits; the lock file may remain and needs no stale-lock deletion. All writers must obey this arrangement; direct concurrent library callers are outside the deployment contract.

## Failures, backups and recovery

Collection, validation or temporary-file write failure exits nonzero and leaves the successful archive untouched. The refresh command emits a JSON diagnostic on stderr with the original error and configured store path. It rereads the durable publication to report `published`, whether the previous snapshot was `retained`, its `lastSuccessfulAt` timestamp and persisted coverage. A first-run failure reports `published: false`, `retained: false` and `lastSuccessfulAt: null`; it does not claim to have retained missing history. If inspection itself fails, those publication facts are `null` and `inspectionError` describes the read failure.

Same-filesystem rename is the publication commit: readers see a whole old or new snapshot. File and directory sync support durable publication on the selected Linux filesystem. A disk or filesystem failure after that commit can leave a newly readable publication despite a nonzero command exit, or require recovery from backup; the diagnostic describes what can actually be read and does not guarantee retention of the previous snapshot. Missing initial history is distinct from an empty successful history: public routes use the shared unavailable-history shell until the first publication. Never expose refresh timestamps, source JSON, coverage diagnostics or operator run state to visitors.

Keep an independent backup of the last successful archive outside the deployment directory. To back it up, copy the published file; atomic replacement keeps a concurrently opened source file coherent. To recover from a corrupt or lost disk, stop scheduled/manual writers, preserve the failed file for diagnosis, restore a known-good archive to a sibling temporary path and rename it to the configured publication path, then inspect it before restarting writers. Restore as `farls-museum`, or set the sibling file's owner/group to `farls-museum:farls-museum` and mode to `0600` before the rename so both services can read it. Ordinary provider failures need only a safe retry; do not delete the published archive. Orphan `.tmp-*` siblings from a killed process are ignored by readers and may be removed while no writer is running.

The project license decision is MIT for authored code/documentation. Preserve the separate font, dependency, artwork and source-data rights in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md). Deployment does not establish rights to third-party artwork.
