# Controlled provider history

[provider-history.json](provider-history.json) is synthetic Sleeper-shaped input for the confirmed application test boundary: controlled source responses → real import/refresh → operator result or public history. It is not a normalized archive, a live-data snapshot, or a claim that import behavior already works. Tests should assert the literal worked results below after importing, rather than testing fixture structure or private functions.

## Replay contract

`responses` maps API paths without `/v1/` or a leading slash to JSON payloads, compatible with `Provider.get(path): Promise<unknown>`. League, account, player, draft and transaction IDs remain strings, including IDs beyond JavaScript's safe integer limit. Source roster IDs, bracket match numbers and weeks retain the provider's numeric shape. Use `seedLeagueId` and the fixed `now`; no routine test needs a network request.

Each variant starts with a fresh deep copy of the base responses. Replace entire payloads listed in `responseOverrides` (do not recursively merge arrays); throw the listed error for `requestFailures`. A missing path is a missing fixture/request, never an implicit empty array. Explicit `[]` means successful empty activity, `null` means missing data, and numeric `0` remains a usable score only when the game is established as complete. The base includes transaction rounds 0–18. Other season/week requests must be justified by source settings and completion state rather than defaulting absent paths to empty.

`adapterEvidence` is separate test input for a future evidence adapter, never part of a Sleeper response. The base provider has no execution/start ordering evidence. Merely loading the JSON must not make either synthetic evidence variant authoritative. Unsupported production formats and exact move rankings stay blocked until an actual adapter supplies the required evidence.

## Base worked history

The seed links 2021 → 2020 → 2019 → null. Synthetic league IDs are `900000000000002021`, `900000000000002020` and `900000000000002019`. Seasons 2019 and 2020 are complete; 2021 has three completed regular-season weeks and numeric zero rows in unplayed week 4. The current fixture NFL state has `week: 4`, `leg: 4`, `display_week: 3`. No 2021 title or full-season award is resolved.

The fixture reproduces the confirmed account changes: roster 7 changes from Woody14 (`472580465006473216`) to Timh17 (`608473907007143936`) in 2020; roster 10 changes from alecswartout (`473910025325113344`) to sebastian12 (`740265931783245824`) in 2021. Their careers stay separate while the two franchise slots continue. User metadata explicitly contains a present-day team label without a historical date; it cannot establish a past team name or a rename date. Roster metadata is null. Use the supported account identity fallback.

| Case | Independently worked observable result |
| --- | --- |
| 2019 regular tie | Roster 1 and roster 2 each score 10.25 in week 1: both records include one tie; margin is exactly zero. |
| Final zero | Roster 3's completed week-1 score is 0 against roster 4's 8. It is a valid low score. The 2021 week-4 zero rows are unplayed and cannot replace it. |
| Native first-round byes | Six 2019 qualifiers have two quarterfinals in week 2. Rosters 1 and 2 enter the semifinals in bracket round 2 and have `matchup_id: null` in week 2. Their 99/98 points and lineup snapshots produce no played win or contribution. There is no invented bye bracket row. |
| Resolved 2019 title | The `p: 1` final is bracket match 6, roster 10 over roster 1, 40.5–35.25 in week 4. Alec is champion; Manager 1 is runner-up. Third/fifth-place results do not add championship-path wins. |
| Official override | 2020 week 1: Tim's raw `points` is 20 and `custom_points` is 25.5 against Alec's 24.25. The official win margin is 1.25; Tim's sole actual starter still contributes 20. |
| Resolved 2020 title | Tim wins the final over Alec 30.5–25.25 in week 2. This is a separate season with a two-team playoff and changed reception scoring, rather than an assumed copy of the 2019 format. |
| Bench/start separation | Manager 1 has three eligible 2021 starts of 10 = 30. Player `901` scores 50 on the bench each week and contributes no starting points. Current player position metadata does not establish historical substitution legality. |
| Schedule comparison signs | In each completed 2021 week the four totals are 10, 30, 20, 40. Tim loses to 40 and out-scores one other team: expected wins 1/3 each week, total 1; actual wins 0. Unluckiest season is +1 and Wins vs expected is −1. Manager 2 wins all three against 10, with expected wins 2: the two comparison values are −1 and +1. |
| Nullable keeper | All draft picks have `is_keeper: null` except Tim's 2020 pick, which is true. Null remains unknown, and an empty `picked_by` does not replace the receiving `roster_id`. |
| Exact move timing absent | Completed acquisitions, drops and trades are retained. Failed transaction `910000000000000003` and pending transaction `910000000000000009` are not completed. The base cannot publish exact pickup/drop rankings from timestamp-shaped values alone. |

## Focused variants

| Variant | Expected use at the application boundary |
| --- | --- |
| `correctedOfficialScore` | After a successful base import, change Tim's 2020 week-1 override to 23.5. Alec now wins 24.25–23.5, margin 0.75; Tim's player points stay 20. A repeat import produces no duplicate result. |
| `missingStarterScore` | Remove player `50`'s week-2 map value and null its ordered starter score. This is unavailable input rather than a zero. Report affected player claims internally and retain the prior complete successful snapshot. |
| `missingResponse` | A previously valid matchup endpoint returns null. Preserve the last successful public history and expose an operator diagnostic. |
| `failedRequest` | A previously valid endpoint throws a controlled timeout. Preserve the last successful public history; a genuine empty transaction round must still succeed. |
| `multiweekFinal` | The synthetic format is deliberately unrecognized (`playoff_round_type: 99`). Without additional evidence it must be gated. An explicitly supplied synthetic format adapter identifies bracket match 1 as weeks 2 and 3: Tim totals 40.5, Alec totals 45.25, so Alec receives exactly one final win/title by 4.75. The individual legs create no extra win or title. This evidence does not define any production integer mapping. |
| `supportedMoveOrdering` | An explicitly supplied synthetic evidence adapter attests event execution/start order with ordinals. It does not reinterpret `created` or `status_updated`. The worked spell results below then apply. |

Under `supportedMoveOrdering`, player `50` is added by Tim before his week-1 start (5), dropped afterwards, added by Sebastian before week 2 (7), dropped afterwards, and reacquired by Tim before week 3 (11). The three pickup events therefore receive **5, 7, 11**, respectively. Tim's first drop receives **7** later points elsewhere, excluding his own reacquisition's 11. Sebastian's drop receives **11** later points for Tim. Distinct events retain their identities and dropping people.

Player `60` starts for Sebastian in week 1 (4), moves by completed trade to Tim before week 2 (6), and trades back before week 3 (8). Sebastian has 12 starting points and Tim has 6 from that player; none is a waiver/free-agent pickup. The first trade also retains a future pick and a five-unit waiver-budget transfer: those assets create no player points and do not credit the pick's original owner. Drafted/traded players and noncomplete attempts must not inherit player `50`'s pickup credit.

This fixture establishes cases for later vertical implementation slices. It does not replace the [real-league coverage audit](../../docs/coverage.md), supply historical legal eligibility, or establish actual NFL kickoff dates. Extend the fixture only when a public/operator behavior requires another case; do not snapshot the entire production corpus.

## Native playoff format boundaries

[playoff-type-1.json](playoff-type-1.json) and [playoff-type-2.json](playoff-type-2.json) are synthetic 2025 provider-shaped responses using the independently observed contemporary semantics documented in [Sleeper formats](../../docs/sleeper-formats.md). Main and lower bracket match numbers deliberately overlap and differ from weekly IDs. Numeric score/lineup rows for unpaired byes must never create played performances.

Type 1: six main qualifiers play first round in week 2, semifinals/fifth place in week 3, and final **and third place** in weeks 4–5. Four lower teams play in week 2 and terminal **weeks 3–4**, including lower third place. Roster 1's final is 10.1 + 20.2 = **30.3**, against roster 5's 20.2 + 15.1 = **35.3**. Roster 1 has one semifinal win and one final loss, not three contests. Main third-place scores are **65–60**. Lower raw `w:7` advances a **20–40** aggregate loser; scored victory belongs to roster 8. Lower `p:1` awards no league title.

At the partial type-1 boundary after week 4, roster 1 retains its 10.1-point first-final-leg start and **60.1** playoff points, with record **1–0** from its resolved semifinal. The incomplete final has no W-L-T/title.

Type 2: first rounds play weeks **2–3**, semifinals/fifth place weeks **4–5**, main final/third place weeks **6–7**. Both legs of a resolved contest share one contest identity. After only week 2, roster 3 has **30** playoff points and its actual start but **0–0** W-L-T. At completion roster 1 is **1–1** and roster 5 is **3–0**. The final retains the same **30.3–35.3** aggregate as type 1.

Boundary tests mutate only provider responses to create partial seasons, null starter placeholders, missing required legs/points, unknown raw enums, absent historical format and repeated refreshes. Expected results are the literal worked examples above, observed through real refresh and public reads.

## Career ranking boundaries

`records-source.ts` constructs controlled provider responses for regular-season career records. It supplies complete roster-week coverage while letting tests specify official scores and explicit unpaired byes. It does not write a normalized archive. Worked cases observed after real refresh and persisted visitor reads include `0.1 + 0.2 = 0.3`, distinct `100.12001` and `100.12` totals, `1/3 = 2/6` win rates, three entries sharing tenth place, and three sharing twentieth place. The latter pages contain 12 and 22 rows respectively; sorting retains those canonical places.

## Scoped starting contributions

Player `107` contributes **15.5 points / 1 start** to Woody's regular-season career and **58 / 4** to Tim's (20 in 2020 plus 15 + 14 + 9 in 2021). Their continuous franchise has **73.5 / 5**, retaining each owner. Combined regular/playoffs gives Tim **88.5 / 5**; his 2020 season is **50.5 / 2**, although the official override makes the two team scores total 56. Player `901` has **zero starts and starting points** despite three 50-point bench performances. Player `103` has one actual zero-point regular-season start in 2019. Null/`'0'` slots and unplayed 2021 week-4 zero rows add no start. Contribution tests observe these values and correction/failure retention through the real refresh and persisted visitor reads; browser screenshots labelled `ticket-12-synthetic-*` use this illustrative input rather than live league statistics.
## Season comparison boundaries

`season-comparisons.node.ts` refreshes controlled source responses into unique durable stores before reading season standings and category pages. Its nine-week fixture repeats official scores `[2, 10, 1, 3, 4, 5, 6, 7, 8, 9]`: Manager 1 loses to 10 and out-scores only 1 each week, so nine exact 1/9 fractions total **1** expected win. Actual wins are zero; Wins vs expected is **−1** and Unluckiest season is **+1**. The persisted visitor read retains `1/1` as the exact comparison key. A completed season without a resolved title has no Best season without a title candidates.

The scoring-era fixture compares one week of `[2, 4, 1, 3]` with two weeks of `[20, 40, 10, 30]`, using changed passing-touchdown rules. Both leading seasons share **60%** dominance despite totals of **4** and **80**. Four true final zeros produce unknown dominance but **0.5** expected wins and **0** schedule difference per team. Explicit unpaired rows produce no expected-win result. Missing completed regular weeks, a missing official score and failed source responses preserve the previous readable publication. The base 2019 tied scores independently yield **0.7** expected wins and shared dominance ranks.

## Rivalry boundaries

`rivalries-source.ts` builds synthetic provider responses for an isolated 2024 browser season: thirteen meetings, a long manager name and failed artwork, shared nemeses, a latest tied meeting, and distinct roster IDs 101–106. It joins the controlled source chain through the real refresh, without modifying existing franchise ownership. Ticket 16 screenshot files marked `controlled` show these synthetic data, never real league facts. Persisted rivalry boundary checks also use the worked provider and native playoff fixtures for replacements, exact margins, missing publication, pending multiweek contests, raw lower-bracket advancement, corrections and retained publication after failure.
