# Requirements reconciliation

Status: Confirmed written handoff, approved by Sam at Q44 on November 3, 2026. All original 54 story IDs remain traceable. Six additions capture requirements settled during the walkthrough. This is a scope ledger, not an implementation-completion report.

The original text is preserved in [.impeccable/spec-before-platform-design.md](../.impeccable/spec-before-platform-design.md). [SPEC.md](../SPEC.md) is the reconciled requirement source, [DESIGN-BRIEF.md](../DESIGN-BRIEF.md) contains route contracts, and [metrics.md](metrics.md) defines internal calculation rules.

## Application acceptance scenarios

Tests start with controlled provider responses, use the real import/refresh entry point, and inspect operator output or public read views. Internal module layout is not a test boundary.

| Scenario | Observable acceptance |
| --- | --- |
| A01 Public navigation | No login; a shared filtered/sorted link reproduces the result. Main navigation resets to defaults, related links preserve context, and Back restores the earlier selection. |
| A02 History import | Follow linked seasons to the earliest reachable source, retain source settings and string IDs, repeat the import without duplicates, and expose every imported year through public history. |
| A03 Identity | Confirmed replacements keep separate careers and a continuous franchise. Supported takeover, predecessor and renames appear in the right timeline. Former managers remain findable. |
| A04 Competition scope | Regular is default; playoff/combined/consolation/placement queries use the right contests. Byes and multiweek legs do not create extra wins/titles. Completed and unresolved championship outcomes are correct. |
| A05 Official results | Preserve overrides, true final zeros, decimal margins, W-L-T and tied ranks. Unplayed/missing scores never become low-score records. |
| A06 Season comparisons | Hand-calculated fixtures produce the expected dominance, expected wins and opposite comparison signs. Full-season awards exclude unfinished seasons. |
| A07 Starting contributions | Person and franchise totals match actual starts and linked games. Bench points and team overrides are not assigned to starting totals. |
| A08 Move attribution | Completed pickup/drop candidates use the right person, ownership spell, source-supported timing and same-season window. Reacquisition/trade/failed-event fixtures do not double-credit a spell. |
| A09 Ranked discovery | Every approved category has correct eligibility/order/history links; initial results include ten places plus all cutoff ties; Show more preserves selection. Home has six agreed categories and recent top-ten events ordered by historical date. |
| A10 Rivalries | Pair/season/scope selections produce consistent records, margins, streaks and game links. Nemesis ties and the no-nemesis case are correct. Zero meetings stays distinct from missing history. |
| A11 Refresh and gaps | Corrections update all affected views. Missing inputs and request failures retain the last successful snapshot and yield useful operator diagnostics. Public pages have no update-status, timestamp or calculation/source panel. |
| A12 Responsive access | At 320px through desktop and 200% zoom, meaningful flows remain usable with keyboard, long names and image failures. Header roles match, complete images have rounded frames, and reduced motion works. |
| A13 Setup | A documented configured league ID drives the same calculations without editing domain logic. Import, repeat refresh, tests and production build have reproducible commands. License/setup choices are recorded before public release. |
| A14 Whole journey | Open Home, a category, a ranked performance, its actual matchup or season, and scoped player history. Share each relevant view, reload and navigate Back without losing identity or filter context. |

A scenario can be covered by more than one focused fixture. Do not write a mirror of every private function. A small fixture should make each expected result understandable.

## Original stories

| ID | Original intent | Current requirement and destination | Acceptance | Local tickets |
| --- | --- | --- | --- | --- |
| 1 | Public access | Retained, every public route needs no account. | A01 | T02, T12 |
| 2 | Phone access | Retained, shared mobile patterns plus per-page responsive contracts. | A12 | T02, T12 |
| 3 | Home discovery | Retained and specified as six all-time categories, then recent results. | A09, A14 | T10 |
| 4 | Share history | Retained, stable routes and shareable filters/sorting. | A01, A14 | T03, T04, T05, T09, T12 |
| 5 | Linked seasons | Retained, importer follows the provider chain. | A02 | T01, T02 |
| 6 | Current completed weeks | Retained, automatic refresh includes eligible completed results. | A02, A11 | T02, T11 |
| 7 | Partial seasons | Revised, completion governs awards and unresolved outcomes; no status badge. | A04, A06, A11 | T04, T06, T11 |
| 8 | Person career | Retained, profile follows the person across accounts/names. | A03 | T03 |
| 9 | Former manager | Retained, replacement gets a separate career. | A03 | T03 |
| 10 | Franchise continuity | Retained, franchise directory/profile is separate from people. | A03 | T03 |
| 11 | Ownership changes | Retained, full franchise timeline attributes each result. | A03 | T03 |
| 12 | Historical names | Retained with supported facts/fallbacks; provenance stays internal. | A03, A11 | T01, T03 |
| 13 | Career totals | Retained, W-L-T, rate, games, points and titles on profiles. | A04, A05 | T03, T05 |
| 14 | Sortable rankings | Retained, category and archive sorts are URL state. | A01, A09 | T05 |
| 15 | Rate sample size | Retained, one eligible game minimum and visible games/W-L-T. | A05, A09 | T05 |
| 16 | Regular default | Retained across game-based views. | A04 | T04, T05 |
| 17 | Playoff/combined | Retained, championship path only in combined. | A04 | T04 |
| 18 | Consolation/placement | Retained, explicit separate selections. | A04 | T04 |
| 19 | Score/streak/margin records | Retained in the plain category catalog. | A05, A09 | T05 |
| 20 | Shared records | Retained, competition ranks and all cutoff ties. | A05, A09 | T05 |
| 21 | Result history links | Revised from evidence to actual career/season/game/player destinations. | A09, A14 | T05, T07, T08 |
| 22 | Champions/runners-up | Retained on Seasons index and season context. | A04 | T04 |
| 23 | Playoff career history | Retained, appearances and resolved runs on profiles/seasons. | A04 | T03, T04 |
| 24 | Historical brackets | Retained, championship/consolation/placement variants and contest links. | A04 | T04 |
| 25 | Standings/format | Retained, season Standings and closed format disclosure. | A02, A04, A06 | T02, T04, T06 |
| 26 | Week browsing | Retained, season Matchups and person/franchise-season views. | A01, A04 | T04 |
| 27 | Lineups/player points | Retained where supported, official totals stay authoritative. | A05, A07 | T04, T07 |
| 28 | Head-to-head | Retained, preselected pair links and Rivalries page. | A10 | T09 |
| 29 | Rivalry facts/games | Retained, compact summary plus linked game table. | A10 | T09 |
| 30 | Nemesis | Revised to plain contextual result in profile Rivalries; agreed rule/ties. | A10 | T09 |
| 31 | Official historical scores | Retained, preserve settings and commissioner adjustments. | A05 | T02, T04, T05 |
| 32 | Cross-era dominance | Retained, regular-season PPG versus league PPG. | A06 | T06 |
| 33 | Schedule comparison | Retained, actual versus weekly all-play expectation. | A06 | T06 |
| 34 | Schedule Victims | Renamed Unluckiest season, expected minus actual wins. | A06 | T06 |
| 35 | Uncrowned Kings | Renamed Best season without a title, completed nonchampion dominance. | A06, A09 | T06 |
| 36 | Franchise Legends | Revised to scoped starting contributors and ranked player/person pairs. | A07 | T07 |
| 37 | Bench Crimes | Renamed Highest-scoring benched player; actual bench points, no counterfactual. | A07, A09 | T07 |
| 38 | Clear exhibit meaning | Revised to plain category names, values and history links. | A09, A14 | T05, T10 |
| 39 | Public method/eligibility | Removed from public UI. Internal rules/tests remain required. | A05, A06, A11 | T05, T06, T12 |
| 40 | Public draft board | Removed from public UI. Source picks/nullable keeper inputs retained internally. | A08, A11 | T01, T08, T12 |
| 41 | Draft-to-contribution history | Revised, supported acquisition inputs connect through Players without a draft-board route. | A07, A08 | T07, T08 |
| 42 | Completed transactions | Revised to internal inputs and significant outcomes; no exhaustive public feed. | A08, A11 | T08, T12 |
| 43 | Failed attempts excluded | Retained at the completed-event boundary. | A08 | T08 |
| 44 | Player season/game links | Retained, manager/franchise-scoped player detail. | A07, A14 | T07 |
| 45 | Corrections | Retained, refresh replaces affected results consistently. | A11 | T11 |
| 46 | Incomplete results excluded | Retained, no false finalized record or zero. | A04, A05, A11 | T02, T04, T11 |
| 47 | Missing versus zero | Retained in data and value states; gaps internal, unknown public fields use a dash. | A05, A11 | T01, T02, T11 |
| 48 | Visible update time | Removed from public UI. Operator run history remains internal. | A11 | T11, T12 |
| 49 | Read through outage | Retained, last successful snapshot remains available. | A11 | T02, T11 |
| 50 | Automatic operation | Retained, configured import/refresh command and automatic scheduling. | A11, A13 | T02, T11 |
| 51 | Repeatable imports | Retained, stable identities and no duplicate observable results. | A02, A11 | T02, T11 |
| 52 | Operator diagnostics | Retained internally; no visitor status dashboard. | A11 | T01, T11 |
| 53 | Configurable open-source setup | Retained, one league per deployment with documented commands. | A13 | T00, T02, T11, T12 |
| 54 | Domain docs/application tests | Retained, these contracts and deterministic import-to-public checks. | A02–A14 | T01–T12 |

## Walkthrough additions

| ID | Added requirement | Destination | Acceptance | Local tickets |
| --- | --- | --- | --- | --- |
| 55 | Productive waiver/free-agent pickup by actual spell contributions | Records and contextual Players | A08, A09 | T08 |
| 56 | Drop followed by later starting production for other people in that season | Records and contextual Players | A08, A09 | T08 |
| 57 | Takeover, predecessor and team-name timeline | Person tenure and separate full franchise | A03 | T03 |
| 58 | Category-first flow, ten places plus ties and Show more | Records category pages | A01, A09, A14 | T05 |
| 59 | Consistent header, rounded complete artwork and responsive row patterns | Shared components and every family | A12 | T02, T12 |
| 60 | Six all-time Home categories then recent top-ten events | Home | A09, A14 | T10 |

No original requirement is silently dropped. Original stories 39, 40 and 48 are retired as public UI requirements. Stories 41 and 42 are intentionally narrowed; their source data remains internal. This ledger does not authorize a later builder to restore those public screens.
