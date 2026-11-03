# Sleeper coverage audit

Read-only audit performed November 3, 2026, for seed league `1385327861673529344`. This establishes observed source coverage, not completed implementation or permission to change metric policy. The accepted policy remains [metrics.md](metrics.md).

## Scope and reproducibility

The audit followed `previous_league_id` to the null reference in 2019. Eight linked seasons were reachable; the chain does not establish the league's founding year. Requests were cached once in `.impeccable/review/coverage/cache/`, using the v1 API path with `/` replaced by `__` as the filename. The audit and summary scripts, full responses, and summaries remain disposable internal review artifacts, not public assets.

The 354 cached JSON responses cover eight league objects, each season's users, rosters, winners bracket, losers bracket and drafts; all matchup weeks 1–18; transaction rounds 0–18; eight draft-pick responses; one NFL-state response; and one NFL player lookup. Transaction round 0 returned an empty list for every season. Completed and failed events were deduplicated by string transaction ID when counting. No draft/transaction endpoint is intended as a public route.

Documented interfaces were checked against [Sleeper API documentation](https://docs.sleeper.com/), specifically Matchups, Playoff bracket, Transactions, NFL state, Draft picks and Players. Some observed fields, including `players_points`, `starters_points` and `settings.last_scored_leg`, are not documented field contracts; validate their presence on every import. Cached observations do not guarantee future retention.

## Observed coverage

| Season | League ID | Source status | Last scored leg | Audited roster-weeks | Completed waiver/FA adds | Completed nontrade drops | Same-week add/start joins |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| 2019 | `462265516384317440` | complete | 16 | 160 | 188 | 163 | 65 |
| 2020 | `601151745808195584` | complete | 16 | 160 | 243 | 240 | 85 |
| 2021 | `726145943233236992` | complete | 16 | 160 | 218 | 212 | 82 |
| 2022 | `858463390849421312` | complete | 16 | 160 | 184 | 176 | 76 |
| 2023 | `992193687163641856` | complete | 17 | 170 | 217 | 209 | 82 |
| 2024 | `1124813385234407424` | complete | 17 | 170 | 192 | 187 | 83 |
| 2025 | `1257057841106141184` | complete | 17 | 170 | 192 | 182 | 93 |
| 2026 | `1385327861673529344` | in_season | 8 | 80 | 129 | 119 | 50 |

Each season returned ten rosters and ten users. All 1,230 audited roster-week rows through the source's last scored leg had numeric team totals, historical starter/player lists and usable recorded scores for every nonempty starter and every bench player. There were no missing player-point entries in this bounded scope. All 611 distinct historical rostered player IDs were present in the current player lookup; that lookup supplies identity labels, not historical lineup eligibility.

There are 56 historical roster-week rows with `matchup_id: null` across 2019–2025, eight per completed season. Their scores/lineups must not become played victories or player starts during a bye. The remaining 1,174 rows represent 587 paired weekly games, before any application classification. None of the audited rows contained a true zero team score or a non-null commissioner override. Those valid cases therefore still need synthetic regression fixtures; absence in this league sample is not permission to reject or rewrite them.

The current NFL-state response was `season: "2026"`, `season_type: "regular"`, `week: 9`, `leg: 9`, `display_week: 8`. It agrees with the seed league's `last_scored_leg: 8`. A score alone cannot prove completion. Preserve this source state and validate a completion cutoff independently of whether a numeric matchup score exists. Do not publish current week 9 as final from a score-shaped value.

All eight drafts and their 1,200 picks were reachable. `is_keeper` was null on 1,170 picks and true on 30; null must remain unknown. Transactions totalled 2,181 unique events: 1,914 complete and 267 failed. There were 22 completed trades, 1,563 completed waiver/free-agent events with adds, and 1,488 completed nontrade events with drops. Counts are events rather than a count of player assets; one event can affect several players. A completed trade's outgoing assets remain ownership boundaries, not drop-ranking candidates. Failed events must not become completed activity.

## Format, brackets and identity

Playoffs start in week 14 for 2019–2022 and week 15 for 2023–2026. Each championship bracket has six qualifying teams and seven source rows: championship-path contests plus third/fifth-place contests. The losers bracket has four rows. Preserve the `p`, progression and winner/loser fields; a late-season week alone does not identify a championship-path game. Source `p: 1` in the losers bracket is the consolation final, never the league title.

All observed configured `playoff_round_type` values are zero; the field is absent in 2019. Actual bracket/week pairings establish single-week rounds for these eight seasons. This audit supplies no observed multiweek league, and the checked API documentation does not establish a mapping from nonzero setting values to round lengths. Gate an unrecognized format with an operator diagnostic instead of guessing. The fixture's explicit synthetic format evidence can verify multiweek contest behavior through a future evidence adapter; it does not establish production Sleeper setting semantics.

The confirmed roster-7 change is backed by owner account IDs: `472580465006473216` (Woody14) in 2019 and `608473907007143936` (Timh17) from 2020. Roster 10 changes from `473910025325113344` (alecswartout) through 2020 to `740265931783245824` (sebastian12) in 2021. Keep these separate people and preserve their continuous franchise slots.

No audited roster metadata contains a historical `team_name`. User responses contain league-scoped metadata with some `team_name` values, but fetching that value today does not establish when a rename occurred or prove a past display name. Preserve provenance internally; use the supported identity fallback unless stronger historical evidence is available. Do not invent exact takeover dates from a season-level ownership change.

## Blocking attribution gap

The agreed **Most productive pickup** and **Dropped players who delivered elsewhere** rankings require exact attribution of starts after an event, including its week. The documented league API supplies weekly starter snapshots and transaction `created`/`status_updated` values, but no historical individual-player game start or lineup-lock timestamps. The documentation does not define either transaction timestamp as a guaranteed execution instant. A millisecond-shaped number and equal weekly `leg` do not prove event-before-start ordering.

This affects all eight seasons. There are 616 joins between a completed waiver/free-agent add and that player's start for the receiving roster in the same source week, distributed in the table above. These are ambiguous event/player/roster/week joins, not 616 proven incorrect contributions. Drop/reacquisition/trade ordering can likewise change spell boundaries and which subsequent starts belong to a particular event. Looking only at later weeks silently changes the agreed claim and is not an acceptable resolution.

Therefore the exact real-league pickup/drop rankings remain **blocked by source evidence** under the current contract. Preserve completed moves and assets, and implement/test the claim only against fixtures whose timing semantics are explicitly established. Do not publish complete-looking production rankings from this source set or declare all v1 requirements complete.

Feasible resolutions require either source-confirmed historical event/start ordering evidence (potentially an additional approved provider) or an explicit product-policy change defining a supported alternative attribution window. Neither has been inferred by this audit. Existing weekly source data supports ordinary starting contributions and bench records independently of this blocker.

## Other limits and publication dispositions

- **Supported:** linked-season discovery; separate owner accounts/careers and franchise continuity; observed official totals; source format/brackets; historical starters/bench and recorded player scores; draft picks and nullable keeper fields; completed event retention. Validate the same coverage at the real import boundary and preserve the last complete snapshot when it fails.
- **Unknown historical names/dates:** use supported fallback identities and season precision. No exact rename date can be derived from today's metadata.
- **Unknown game timestamps:** matchup rows have no `played_at` or equivalent field. Historical ordering can retain the supported season/week precision; never substitute import time or invent kickoff times. Any feature requiring exact calendar dates needs an additional supported source.
- **Blocked required claims:** exact pickup/drop ownership-spell rankings from production Sleeper inputs, because same-week execution/start ordering is not established.
- **Fixture handoff:** [provider-history.json](../tests/fixtures/provider-history.json) contains controlled Sleeper-shaped responses, with a [fixture guide](../tests/fixtures/README.md) documenting independently worked expectations and source-boundary variants. These are synthetic examples, not copied league history. No application implementation is verified by this audit; later tickets must exercise the real import/refresh entry point and inspect operator output or public history.

No source failure occurred in the final cached API pass. An initial documentation request without an explicit user agent returned HTTP 403; the normal identified client request succeeded. This was not a destination-policy bypass. Public screens should contain none of these diagnostics, operational dates or source dumps.
