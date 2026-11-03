# Player-impact feasibility

Status: DRAFT RESEARCH, not approved metric policy. Inspected October 30, 2026. This note supports the design interview and makes no UI, ranking, significance, or time-window decision.

November 3 handoff note: the later walkthrough selected pickup/drop policies and the internal coverage boundary in [docs/metrics.md](../docs/metrics.md). That contract supersedes the old Decisions still needed section below. This research has not become a full coverage audit; implementation ticket T01 still requires that work.

## Evidence boundary

Read `SPEC.md`, `PRODUCT.md`, `platform-design-decisions.md`, and `platform-design-inventory.md`. The task's latest interview decisions supersede the older documents where they disagree. Raw draft and transaction proposals Q15/Q16 are unapproved. Public calculation panels, operational status, and update dates are rejected. Manager and franchise contribution scopes remain separate.

Local discovery records eight linked seasons, 2019–2026, and sampled historical endpoints on October 27. It is not an imported history or coverage audit. The local implemented data is synthetic. No complete raw historical player-point or transaction dataset was found.

## Documented data

| Source | Fields or behavior |
| --- | --- |
| [Transactions](https://docs.sleeper.com/#get-transactions), `GET /league/{league_id}/transactions/{round}` | Types shown: `trade`, `free_agent`, `waiver`. Completion example: `status: complete`; no exhaustive status enum. `transaction_id`, `roster_ids`, `creator`, `consenter_ids`, `created`, `status_updated`, `leg`. Football `leg` and request `round` denote week. `adds`/`drops` map player IDs to receiving/dropping roster IDs. Arrays/maps can be null or empty. |
| [Transaction assets](https://docs.sleeper.com/#get-transactions) | `draft_picks`: season, round, original roster, previous owner, new owner. `waiver_budget`: sender, receiver, amount. `settings.waiver_bid` may record FAAB bids; `metadata` may describe unsuccessful waivers. |
| [Drafts](https://docs.sleeper.com/#get-all-drafts-for-a-league), [picks](https://docs.sleeper.com/#get-all-picks-in-a-draft) | Multiple drafts per league. Picks carry `draft_id`, `player_id`, receiving `roster_id`, `picked_by`, `round`, `draft_slot`, `pick_no`, metadata, nullable `is_keeper`. `picked_by` can be empty. [Draft details](https://docs.sleeper.com/#get-a-specific-draft) map slots to rosters. |
| [Matchups](https://docs.sleeper.com/#getting-matchups-in-a-league) | Weekly rows identify `roster_id`, `matchup_id`, ordered `starters`, all `players`, `points`, and `custom_points`. Bench is players minus starters. |

The docs do not describe `players_points` or `starters_points`. They also do not provide a documented historical player-stat endpoint that fills missing league matchup scores or scores for every unrostered player. [Player metadata](https://docs.sleeper.com/#fetch-all-players) is an ID lookup, not proof of historical lineup eligibility.

## Narrow provider observation

Checked only [2019 week 1](https://api.sleeper.app/v1/league/462265516384317440/matchups/1) to resolve the undocumented player-point shape. Final successful extraction was at `2026-10-30T20:00:47Z`. The same URL was repeated after a PowerShell array-extraction mistake; no additional season/week endpoint or history cascade was requested.

The response contained ten rows. All ten had `players_points` and `starters_points`. First row: roster 1, nine starters and nine ordered starter scores, fifteen players and fifteen player-keyed scores. Starter `4046` had `35.32` in both the first ordered entry and the player-keyed map. This establishes that the fields exist in this response. It establishes neither a documented contract nor complete historical availability, consistent alignment, or future retention.

## Feasibility matrix

All point-based rows below depend on usable returned player scores. Actual league-wide coverage remains unknown.

| Candidate historical fact | Feasibility | Required join or limit |
| --- | --- | --- |
| Player's recorded starting contributions for a manager/franchise | Conditional, response-observed | Player ID in weekly starters plus recorded score; season roster mapped to the selected person or franchise. |
| Contributions after a waiver/free-agent acquisition | Conditional | Completed add event → player and receiving season roster → subsequent starts in the relevant ownership spell. |
| Dropped player later contributing to another team | Conditional | Completed drop → subsequent acquisition/start on another season roster. This can describe what happened, not a legal missed opportunity or a caused loss. |
| Drafted or kept player contributing to that team | Conditional | Draft pick's receiving roster and player → ownership spell → recorded starts. Null keeper values do not prove nonkeeper status. |
| Actual contributions of players received/sent in a trade | Conditional | Completed trade's recorded assets → each player's subsequent roster spells and starts. Pick/FAAB assets have no direct starting-point equivalent. No trade-winner claim follows automatically. |
| Every dropped player's later NFL production, including while unrostered | Not established by documented API | League matchup rows are not a complete NFL scoring universe. |
| A drop, benching, or trade cost a win | Not established by these fields | Requires a defined counterfactual and historical legal eligibility; team totals cannot supply either. |

## Internal modeling limits

- Keep official team `points` and commissioner `custom_points` distinct from player contributions. A player sum is not a replacement for an official result. Do not allocate a team override to individual players without source support.
- `created` and `status_updated` have timestamp-shaped numeric examples. The docs do not precisely define their units or guarantee an execution timestamp. Request week and `leg` do not prove whether a same-week move happened before an individual player's game or lineup lock. No per-pick execution timestamp appears in the documented pick example. Do not invent precise event-to-start timing.
- Associate contributions with ownership spells. A draft, drop, trade, and reacquisition of the same player must not all receive the same later points. A receiving roster, a pick's original owner, a transaction creator, and a person are different identities. Resolve roster IDs within their league season and split manager tenure from franchise continuity.
- Include only source-confirmed completed events in completed activity. Unknown/noncomplete statuses must not become completed moves. Failed requests, missing weeks, incomplete event history, genuine empty weeks, and null fields are different. A point row alone does not prove how the player was acquired.
- Ordered starters and current player positions do not prove a legal historical replacement. Raw bench scores can describe bench performances when present; stronger missed-opportunity claims require additional facts.
- Weekly observations can support later recorded contributions even when exact same-week attribution is unresolved. They do not prove the event caused performance, wins, or championships.

These limits belong in import behavior, tests, and developer documentation. They do not approve public warnings or evidence UI.

## Decisions still needed

Sam must choose which acquisition/drop/trade/draft stories merit a public place, what significance means, eligible game scope, attribution windows, and how separate ownership spells count. He must also decide whether incomplete eligible data omits a candidate or changes the claim's scope. Those are product policies; endpoint availability cannot decide them.

Before implementation promises a complete point-based ranking, a bounded coverage audit needs to establish usable player scores and event coverage for its chosen scope. That audit was not performed here.
