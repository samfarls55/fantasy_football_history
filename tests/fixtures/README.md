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
