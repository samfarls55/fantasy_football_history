# ADR 0001: Node SSR with an atomic local archive

Status: accepted for V1, November 3, 2026. Implements delivery choices in [issue #3](https://github.com/samfarls55/fantasy_football_history/issues/3).

The public museum needs durable history through provider outages and process restarts. Refreshes must publish a coherent complete candidate, and new history must be readable without a new frontend build. V1 serves one configured league per deployment.

Keep Astro and TypeScript. Use `@astrojs/node` in standalone server mode on a Linux host with a durable local filesystem. One `Archive` JSON file contains the canonical history and internal source/coverage inputs. `MUSEUM_STORE_PATH` selects its runtime location. Published files live outside the source checkout in production; the repository ignores local `data/` history.

Refresh prepares and validates a complete archive before calling `publishArchive`. The store validates its envelope, writes a unique sibling temporary file, flushes and closes it, and renames it over the publication on the same filesystem. It then flushes the parent directory. It never truncates the published file. `loadArchive` reads the current publication on each call. Missing files mean no initial publication; corrupt files are operator errors. An existing store cannot be overwritten by a different league. Semantic completeness and the treatment of individual provider gaps belong to the importer.

Use one systemd web service and a daily oneshot refresh at 10:00 UTC, with missed runs caught up by `Persistent=true`. An OS `flock` serializes scheduled and manual refresh commands across the entire collection/publication operation. A stateless or ephemeral filesystem host is incompatible with this arrangement unless it mounts a durable volume. Shared/network filesystems, multiple independent writer hosts and a database are outside this V1 choice.

Project-authored code and documentation use MIT; fonts, dependencies, source data and artwork keep their own rights and notices. [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md) records that boundary.

This decision provisions no host, account, paid service, domain, TLS certificate, service user or active timer. Those are operator deployment choices. [Operations](../operations.md) records configuration, local proof, installation expectations and recovery. Import traversal and complete-archive refresh are delivered by dependent issues #4 and #18.
