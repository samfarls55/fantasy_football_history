# Sleeper contests and weekly lineups

This is the durable provider-format evidence for the shared classification introduced in ticket #5. Public pages contain historical results, never these implementation notes. The source findings were checked on November 3, 2026.

## Identities and scopes

The [official bracket contract](https://docs.sleeper.com/#getting-the-playoff-bracket) defines `r` as a bracket round and `m` as an identifier within one bracket. Winner/loser progression comes from `t1_from` and `t2_from`. The [weekly matchup contract](https://docs.sleeper.com/#getting-matchups-in-a-league) pairs rows by weekly `matchup_id`. Those identifiers are independent. For example, the [2025 main final](https://api.sleeper.app/v1/league/1257057841106141184/winners_bracket) is bracket `m:6`, while its [week-17 pairing](https://api.sleeper.app/v1/league/1257057841106141184/matchups/17) is weekly `matchup_id:1`.

Normalize bracket identity as league + bracket family + bracket match. Match actual weekly legs using the expected weeks and unordered roster pair. Preserve weekly IDs on performances separately. A pair must match exactly one bracket entry; missing or ambiguous required pairings fail the candidate refresh before atomic publication.

Championship playoffs are the unique main `p:1` and its winner-edge ancestors. Other main-bracket contests, including `p:3` and `p:5`, are placement. The lower endpoint is a separate consolation family; its bracket-relative `p:1` never awards a league championship. Combined includes regular and championship-path games only. All consumers use `inScope`; finalized W-L-T consumers use `completedContests`.

Six-team main brackets have direct entrants into later rounds. A qualifying bye is not an extra contest. Null weekly matchup rows can carry scores and starters; they produce neither a played performance nor a start. Empty starter placeholders (`null` or `"0"`) likewise never become players or starts. Keep actual slot indices for the remaining starters.

## Supported round formats

The official API does not document `playoff_round_type`. Support therefore requires both the evidence below and validation of actual required pairings at import.

| Source setting | Interpretation and support boundary |
| --- | --- |
| `0` | One week per round. Observed in the completed 2020–2025 linked league seasons. |
| Missing | Single-week interpretation is accepted only for a completed season whose actual paired legs establish it. The linked 2019 season supplies this evidence; absence is not a universal default. |
| `1`, 2021 onward | Each bracket's terminal round takes two weeks; earlier rounds take one. Terminal `p:3` is included. The lower bracket uses its own terminal round, which can finish earlier. |
| `2`, 2021 onward | Every round takes two consecutive weeks, including placement and lower brackets. |
| Other values or historical `1`/`2` | Explicit unsupported/unverified format error. No coercion to `0`. |

For contemporary type 1, direct evidence is public 2025 league [1266123600922935296](https://api.sleeper.app/v1/league/1266123600922935296). Its [six-team main bracket](https://api.sleeper.app/v1/league/1266123600922935296/winners_bracket) plays weeks 15, 16 and **17–18**, including third place. Its [four-team lower bracket](https://api.sleeper.app/v1/league/1266123600922935296/losers_bracket) plays weeks 15 and **16–17**, including its third-place contest. The title aggregate is 285.44–244.54; main third place is 236.58–119.98. Extending only `p:1`, or using the main bracket's round count for the lower bracket, would lose genuine weekly legs.

For contemporary type 2, direct evidence is public 2025 league [1251642456043180032](https://api.sleeper.app/v1/league/1251642456043180032). Its [main bracket](https://api.sleeper.app/v1/league/1251642456043180032/winners_bracket) has first-round pairings over weeks **14–15**, and title/third-place pairings over **16–17**. The final aggregate is roster 9's 217.40 against roster 2's 288.40. The lower bracket also has two-week rounds.

Pinned independent consumers corroborate the three contemporary cases: [league-page](https://github.com/nmelhado/league-page/blob/ea33a685637affc5520a094d251e9b3c7c4ce6dc/src/lib/utils/helperFunctions/leagueBrackets.js#L34-L47) and [mfl-league-fetcher](https://github.com/jeleff1000/mfl-league-fetcher/blob/c22665726014f4d0ee8f5191429bcce6187237f4/fantasy_football_data_scripts/multi_league/data_fetchers/sleeper/playoff_utils.py#L1-L16). The former reports a different 2020 meaning for raw `1`; this is why historical nonzero enums remain gated rather than borrowing modern semantics. [any-given-sunday](https://github.com/sam-maryland/any-given-sunday/blob/169635c2baeb67a08769d350ee5e4060fef26f30/worker/src/domain/sleeperMatchups.ts#L74-L89) extends every terminal-round contest for contemporary type 1, consistent with the direct third-place sample.

## Completion and results

A contest has explicit `complete` state. All expected weekly legs must have completed, paired, validated input and the source bracket must have a resolved pair of advancement outcomes. Only complete contests enter W-L-T. A half-finished two-week contest keeps its completed performances and starts, including eligible weekly score records and career points. It has no win, loss, tie or title yet. Scores aggregate with exact decimal addition and the contest is counted once. Reimport uses stable identities and corrections replace the coherent publication.

Raw lower-bracket advancement is distinct from a scored win. In all 28 completed lower-bracket rows of the linked 2019–2025 sample, `playoff_type:0` raw `w` advances the **lower** scorer. The [2025 lower bracket](https://api.sleeper.app/v1/league/1257057841106141184/losers_bracket) advances roster 8 over roster 6, while [week 15](https://api.sleeper.app/v1/league/1257057841106141184/matchups/15) scores them 89.2–133.18. Preserve raw advancement and placement in `BracketEntry`; determine scored W-L-T from official aggregate totals. Never turn the lower final into a title or reject it merely because raw `w` scored less. Tied scores remain tied; unsupported playoff tiebreak policy is not invented here.

## Qualification and season honors

`Season.playoffPersonIds` contains the unique people entering the main championship path directly, including entrants with a first-round bye. Entrants fed by prior winner edges are the same qualification, never a second appearance. Qualification requires every regular-season week through the week before the playoff start to be completed and imported. Current completion is bounded by the ended NFL week, so a week-9 pre-seeded bracket for week-15 playoffs does not establish qualification. Once the final regular week is completed, the source's actual entrants establish appearances even if no playoff leg has ended. Byes create no contest, score or player start.

`Season.championId` and `runnerUpId` use only the unique main title entry after its shared contest completion gate passes. A lower `p:1`, main placement row, single leg, or a pre-filled future result cannot award a title. A non-tied title's source advancement must agree with its official aggregate score; a contradiction rejects the candidate and keeps the previous publication. Equal aggregate scores remain a scored W-L-T tie, while a resolved official main-title advancement can establish champion and runner-up without inventing a tiebreak formula. Repeat imports and corrections replace these season fields rather than incrementing a separate title counter.

The bracket read view uses the same completion gate. Completed contests expose official aggregate scores and raw advancement. Unfinished aggregates display an em dash; completed legs remain linked through the contest detail. A participant fed by another contest remains unassigned until that source contest resolves, even if a future row contains a provisional roster. Seeds remain omitted when the provider has supplied none; official standing or bracket position is not relabeled as a seed.

Official `custom_points` overrides the source team `points`, including a real zero override. Keep both source fields. Player map/ordered starter points remain recorded player points. A team adjustment is never redistributed. Unknown optional bench points display an em dash and create an internal coverage issue blocking `benched-player` claims for that input. Missing required starter points reject the candidate with the precise season/week/roster/player diagnostic, preserving the previous successful snapshot. Current player position metadata is not historical lineup eligibility; starters display season lineup slots, and unsupported bench slots stay unknown.

## Reproducible evidence

`tests/fixtures/provider-history.json` covers bracket/weekly ID mismatch, native byes, main placement, official override and completed zero. `playoff-type-1.json` and `playoff-type-2.json` are synthetic provider-shaped histories, with literal pairings based on the independent contemporary format evidence above. They are not live league data or release-coverage claims. Import-to-public tests cover final and partial boundaries for both formats, lower advancement, empty slots, repeat/correction refresh and failures retaining history.

Matchups use `tab=matchups`, `scope` and `week`. Their default is the latest completed week with a performance in the selected scope, falling back to the latest completed season week for an empty scope. A valid selected completed week stays selected even when it has no games in that scope. Detail links retain the selected week/scope; `player` and optional roster `team` select a quiet lineup row, with fragment `#player-[roster]-[player]`. Player links use the person's scoped player-history route and retain `season` and `scope`.

Playoffs use `tab=playoffs` and one `scope` selector: `playoffs` initially, with `consolation` and `placement` when present. Changing the season retains that bracket selection; an unavailable or invalid scope normalizes to championship playoffs. Round/week links open a contest's latest completed leg while its detail retains every completed leg. The desktop progression diagram sits in a labeled, keyboard-scrollable local region on phones. `tests/operations/playoffs.node.ts` verifies persisted qualifications, official tied-title outcomes, contradictory title rejection, both native multiweek formats and correction/repeat behavior; `tests/playoffs.spec.ts` verifies championship-history links, alternate bracket links, future unknowns and containment at 320–1440px.
