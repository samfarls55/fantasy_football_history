# Fantasy football league museum v1

Status: Confirmed design handoff, November 3, 2026. Sam approved the written scope and design at Q44. Implementation follows the separate implement-spec workflow. [DESIGN-BRIEF.md](DESIGN-BRIEF.md) defines the page contracts, [docs/metrics.md](docs/metrics.md) defines internal calculation rules, and [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md) defines local tickets and blocking relationships. The earlier spec is preserved in [.impeccable/spec-before-platform-design.md](.impeccable/spec-before-platform-design.md).

Published parent specification: [GitHub issue #1](https://github.com/samfarls55/fantasy_football_history/issues/1), labeled ready-for-agent. It retains all 60 story IDs and links the approved design and metric contracts at their committed revision. The approved 18 child tickets are published as issues [#2–#19](https://github.com/samfarls55/fantasy_football_history/issues/1), with native parent-child and blocking relationships and ready-for-agent labels.

## Problem Statement

Our league's history is spread across seasons in Sleeper. We want one place to see how everyone has done, revisit old matchups, settle arguments, and find things we wouldn't have thought to look for. A list of standings alone won't do that. The site should feel like a museum of the people, teams, achievements, and disasters that make this league ours.

The league previously used ESPN. Combining that history with Sleeper is a later project. The first version needs to make the available Sleeper history useful without creating another thing somebody has to maintain every week.

## Solution

Build a public, automatically updated league museum for Farls da bag. Visitors discover specialized league records and explore careers, franchises, rivalries, seasons, games and player contributions. The current season joins the museum as weeks are completed. Drafts and completed transactions remain internal inputs to contributions and significant pickup/drop outcomes. V1 has no public draft board or exhaustive transaction feed.

Careers belong to people. Franchise views preserve continuity when a different person takes over a team. Regular-season records are the default, with separate playoff records and an option to combine them. Consolation and placement results remain distinguishable.

The museum discovers stories in the results. Use plain category names grouped into Careers, Seasons, Matchups and Players. Records open a category leaderboard and then the relevant history. Legacy exhibit names are historical aliases, not required labels. Calculations and eligibility are documented and tested internally; public pages show results, sample sizes and history without calculation panels, source dumps, operational status or update dates.

The project will be open source and configured for this league first. Anyone with a link can visit without an account.

## User Stories

1. As a league member, I want to visit the museum without creating an account, so that I can open it directly from the group chat.
2. As a visitor, I want the museum to work on my phone, so that I can browse history wherever a league argument starts.
3. As a league member, I want the home page to surface notable achievements and disasters, so that I can discover history without knowing which statistic to search for.
4. As a league member, I want to share a direct link to a category result, profile, season, rivalry or game, so that other people see the same history and selected filters without an account.
5. As a league member, I want all available linked Sleeper seasons included, so that career records reflect the league's available history.
6. As a league member, I want completed weeks from the current season included automatically, so that new records become part of the museum during the season.
7. As a league member, I want only completed games counted and unresolved season outcomes left unset, so that partial results are not presented as full-season awards or titles. No public ongoing/update-status badge is required.
8. As a manager, I want a career profile that follows me across seasons and team-name changes, so that my achievements remain connected to me.
9. As a former manager, I want my career preserved after I leave, so that my history isn't reassigned to my replacement.
10. As a league member, I want a separate franchise view, so that I can follow a team's history across ownership changes.
11. As a league member, I want ownership changes shown in the franchise history, so that I can tell who earned each result.
12. As a league member, I want supported season-specific team names preserved, so that the archive stays recognizable without inventing past names or exact dates. Missing names use a supported identity fallback; provenance stays internal.
13. As a manager, I want career wins, losses, ties, win percentage, points, and championships, so that I can understand my overall results.
14. As a league member, I want sortable leaderboards, so that I can compare managers using the statistic that matters to the discussion.
15. As a league member, I want sample sizes shown with rate statistics, so that a short career isn't mistaken for a long record of success.
16. As a league member, I want regular-season records selected by default, so that the main comparisons use a consistent set of games.
17. As a league member, I want separate playoff records and a combined view, so that I can compare postseason performance without losing the regular-season context.
18. As a league member, I want consolation and placement games identifiable and separately selectable, so that they don't quietly inflate career totals.
19. As a league member, I want scoring highs, lows, winning streaks, losing streaks, close games, and blowouts, so that the record book captures more than standings.
20. As a league member, I want shared records displayed as ties, so that the museum doesn't invent a winner.
21. As a manager, I want each leaderboard result to link to its supporting history, so that I can inspect how it was earned.
22. As a league member, I want a championship history with champions and runners-up, so that I can trace who reached and won the title game each year.
23. As a league member, I want playoff appearances and championship runs on manager profiles, so that I can see how each person performed when titles were at stake.
24. As a league member, I want historical playoff brackets and results, so that I can revisit each championship path.
25. As a league member, I want season standings and the format used that year, so that I can understand results in their original context.
26. As a league member, I want to browse a season by week and matchup, so that I can revisit individual games.
27. As a league member, I want historical scores, starters, bench players, and available player points, so that I can understand what happened in a matchup.
28. As a manager, I want my head-to-head history against another manager, so that I can settle who has had the upper hand.
29. As a league member, I want rivalry records, scoring margins, streaks and individual games, so that I can revisit the results behind a rivalry.
30. As a manager, I want my nemesis shown in my Rivalries view using the agreed opponent-ranking rule, so that I can discover which opponent has caused me the most trouble.
31. As a league member, I want actual historical scores retained, so that official records continue to reflect the rules used at the time.
32. As a league member, I want dominance comparisons against each season's league average, so that scoring eras and different season lengths don't determine every comparison.
33. As a manager, I want to compare actual results with results against the rest of the league's weekly scores, so that I can understand the effect of my schedule.
34. As a league member, I want Unluckiest season to rank expected wins minus actual wins, so that strong scoring with disappointing results is remembered.
35. As a league member, I want Best season without a title to identify dominant completed nonchampionship seasons, so that great teams aren't forgotten because they lost in the playoffs.
36. As a manager, I want starting-point contributors shown for my career, with a separate franchise scope, so that I can recognize the players associated with that history.
37. As a league member, I want Highest-scoring benched player to surface actual unused performances, so that memorable bench scores become part of the archive without an unsupported missed-win claim.
38. As a league member, I want plainly named record categories with clear values and historical destinations, so that I understand what is being ranked without helper paragraphs.
39. Removed from public v1: method and eligibility explanations on each award page. Sam expects correct results; retain methods and eligibility in developer documentation and deterministic tests.
40. Removed from public v1: standalone draft boards. Preserve source picks and available keeper fields internally where needed for ownership/contribution history.
41. As a manager, I want recorded contributions connected to how players joined my team when supported, so that draft/acquisition inputs inform specialized history without a public draft board.
42. As a league operator, I want completed trades, waivers and free-agent moves preserved internally, so that significant pickup/drop contributions can be calculated without an exhaustive public transaction feed.
43. As a league member, I want unsuccessful transaction attempts excluded from completed activity, so that the archive reflects moves that actually happened.
44. As a manager, I want player contributions connected to the relevant seasons and matchups, so that I can inspect the history behind a player total.
45. As a league member, I want later score corrections reflected in records and exhibits, so that the museum stays consistent with official results.
46. As a league member, I want unplayed games and incomplete results kept out of finalized records, so that zero scores or unfinished weeks don't create false achievements.
47. As a visitor, I want missing history distinguished from a genuine zero or no activity, so that an incomplete import doesn't mislead me.
48. Removed from public v1: last-update timestamps and freshness/status indicators. Retain successful-run timestamps and diagnostics internally for the operator.
49. As a visitor, I want previously imported history to remain available when Sleeper is temporarily unavailable, so that a source outage doesn't empty the museum.
50. As a league operator, I want the initial history import and later updates to run automatically, so that routine maintenance doesn't require manual data entry.
51. As a league operator, I want imports to be safe to repeat, so that retries don't duplicate games, transactions, or championships.
52. As a league operator, I want import failures and coverage gaps reported clearly, so that I can resolve data problems without auditing every page.
53. As an open-source user, I want documented setup with a configurable Sleeper league ID, so that I can run the project for a league without changing its record calculations.
54. As a contributor, I want documented domain rules and deterministic tests through the application boundary, so that I can change the project without quietly rewriting league history.
55. As a league member, I want Most productive pickup to rank a completed waiver/free-agent acquisition by actual starting points in full weeks after its acquisition week and before its departure week or through season end, so that useful roster moves are remembered.
56. As a league member, I want Dropped players who delivered elsewhere to rank starting points in weeks strictly after the drop week for other league people in the same season, so that significant departures are remembered without hypothetical win claims.
57. As a manager, I want a tenure timeline showing takeover, predecessor when known and team-name changes, with a separate full-franchise timeline across owners.
58. As a visitor, I want a category page to show ten ranked places plus cutoff ties and Show more, then link each result to the relevant history.
59. As a visitor, I want one consistent desktop header and mobile Menu pattern, complete artwork in rounded frames, and readable responsive archive rows.
60. As a league member, I want six all-time Home categories followed by recent events currently in the top ten, so that the archive leads with its most interesting history.

## Implementation Decisions

- V1 serves one configured league per deployment. The initial league is [Farls da bag](https://sleeper.com/leagues/1385327861673529344/), with seed league ID `1385327861673529344`. Hosted signup and management of multiple leagues are outside this release.
- Use documented, read-only Sleeper data for the first provider. Follow each season's previous-league reference to discover its linked history. Keep provider identifiers as strings to preserve their full precision.
- Astro and TypeScript are confirmed. The existing home is a synthetic prototype with six authored Playwright tests. Preserve its visual system while replacing its inline public evidence interaction with the approved category-ranking flow. An importer, durable history store, refresh scheduler and remaining routes still need implementation. Hosting and persistence remain undecided.
- The application needs responsibilities for importing source data, resolving manager and franchise identities, calculating records and exhibits, and presenting public history. These are logical responsibilities within the application; their interfaces should support a single import-to-visitor test boundary.
- Distinguish a person, a Sleeper account, a franchise, a season roster, a matchup, and a player. Account identity and roster identity must not be treated as interchangeable. Roster identifiers are interpreted in the context of their league season.
- Default career queries group results by person. Franchise queries follow the league's roster continuity and expose ownership periods. Preserve enough source identity and provenance to support later history merging without implementing ESPN support now.
- Two confirmed changes represent different people: Woody14 to Timh17 in 2020 at roster 7, and alecswartout to sebastian12 in 2021 at roster 10. Keep these careers separate while retaining the corresponding franchise histories. Account names returned today are not proof of historical display names.
- Preserve source results, available historical lineups, scoring settings, and playoff settings by season. Respect official team scores and commissioner overrides rather than assuming that summing player scores always reproduces the official team result.
- Distinguish regular-season games, championship-path playoff games, consolation games, and placement games. Regular-season records are the default. The combined view includes regular-season and championship-path playoff results; consolation and placement results require an explicit selection.
- Determine titles from resolved championship results. Do not count byes, placement wins, or individual weeks of a multiweek contest as additional championships or independent playoff victories.
- Preserve actual scores for official scoring records. For season dominance, compare points per played regular-season game with that season's league-wide points per team-game. Completed current-season games count, but full-season awards and unresolved titles do not. Do not add public status labels.
- Calculate expected wins from the fraction of other teams outscored in the same completed week, with half credit for ties. Unluckiest season ranks expected minus actual wins; the season table's Wins vs expected shows actual minus expected. Use the same eligible weeks.
- Best season without a title ranks completed nonchampionship seasons by dominance. Nemesis uses the largest positive losses-minus-wins value against an opponent in the selected scope, preserving ties. Assign no nemesis if nobody has a winning record against that person.
- Count player contributions only from actual starting-lineup points in the selected manager/franchise scope. Keep bench points separate and make no counterfactual missed-win or legal-substitution claim.
- On November 3, 2026, Sam explicitly revised both move measures to later weeks only, excluding the move week. Productive pickups use completed waiver/free-agent acquisition spells: credit full weeks strictly after the acquisition week and strictly before the departure week, or through season end without a departure. Significant drops credit starts strictly after the drop week for other people in the same season. Both retain the selected game scope. Reacquisitions remain distinct; draft, trade and commissioner inputs preserve ownership boundaries without making their arrivals pickup candidates. Trades are not drop candidates. Verify recorded event chronology and actual source coverage; exact player kickoff/lineup-lock timing is neither required nor inferred under this policy.
- Preserve draft picks, available keeper designations, completed moves and their assets internally. No public draft board, exhaustive transaction feed, trade-winner grade or invented draft-value formula is required.
- Use the plain category catalog and metric rules in docs/metrics.md. Do not add opaque exhibit labels, taglines or redundant helper text. Streaks, rate eligibility, tie handling and cutoff behavior are fixed there from the walkthrough.
- Initial import and ongoing updates must be repeatable. Completed current-season weeks join the archive, later corrections recalculate affected results, and incomplete weeks do not enter finalized records. The refresh mechanism and cadence are implementation choices; live scoring is not required.
- Retain the last successful imported history if a later source request fails. Track coverage and run status internally. Missing source data must remain distinguishable from a zero, an unplayed game or an empty transaction week. Public pages have no operational status or update-date UI.
- Public pages and individual historical results need stable, directly shareable links. Viewing requires no account. The site should remain usable on mobile screens.
- Awards and league stories in v1 are generated from the available data. Runtime language-model calls and manual recap authoring are not required for the museum to operate.
- Document metric rules in developer documentation and enforce them consistently across profiles, rankings and history. A rate requires at least one game and shows its sample size. Public calculation/methodology screens are outside v1.

## Testing Decisions

- Confirmed test boundary: exercise the application from controlled Sleeper responses through its real import or refresh entry point, then inspect the resulting public history. Prefer this one application boundary over tests coupled to the internal module layout.
- A good test supplies a small, understandable history and checks what an operator or visitor can observe. It should establish an actual result, such as the correct champion, a separate replacement-manager career, or a corrected record. It should not mirror private functions, assert internal call sequences, or depend on the live league changing in a particular way.
- Six existing Playwright tests cover the synthetic Home prototype. Adapt the superseded evidence-flow assertions during implementation. Add deterministic import-to-public fixtures for the whole platform. The real league can support a bounded coverage check, but routine regression tests must not require live requests.
- Exercise the importer, identity handling, record calculations, exhibit calculations, and public read views through the same application boundary. Use browser checks for visitor behavior such as following a record to its supporting matchup and opening a shared link on a mobile viewport.
- Cover an import across linked seasons and assert that the earliest reachable season, all included seasons, and coverage gaps are reported correctly.
- Cover an ownership replacement and a team-name change. Assert that the replacement does not inherit the departing person's career and that the franchise view retains both ownership periods.
- Cover regular-season, playoff, consolation, and placement results. Assert that default, playoff-only, and combined totals use the intended games, and that a bye or multiweek playoff contest doesn't produce extra wins.
- Cover a completed championship and an unfinished current season. Assert the correct champion and runner-up for the completed season and no invented title for the unfinished season.
- Cover changed scoring rules, different season lengths, ties, and a commissioner-adjusted score. Assert accurate official records and separately reproducible season-dominance comparisons.
- Cover expected wins with a hand-calculated week, assert both comparison signs, then follow the ranked result to its manager-season and actual games. No public calculation panel is expected.
- Cover starter/bench separation and unavailable historical eligibility. Assert accurate contributions and no legal-substitution or missed-win claim.
- Cover nullable keeper inputs, completed and unsuccessful moves, trade ownership changes, reacquisition, significant pickups and later production after drops. Assert actual spell attribution and no public draft board or all-transactions feed.
- Import the same history twice and assert unchanged observable totals. Apply a later score correction and assert that affected standings, records, rivalries, and exhibits update without duplicate history.
- Cover an unplayed game, incomplete response and failed request. None becomes a false zero-score record. The last successful history remains readable and the operator receives accurate internal diagnostics, without a public update-status component.
- Verify tied ranks, cutoff ties, sample sizes, linked historical destinations and shared filtered URLs without login. Verify calculation correctness through the application boundary, not a public methodology UI.
- Verify all route families at narrow and desktop widths, shared header/title roles, complete rounded source images, keyboard navigation, Back/filter restoration and reduced motion. Detailed mobile polish is implementation work, not permission to ship unusable phone views.

## Out of Scope

- Public method/evidence panels, source JSON, operational status and freshness/update dates.
- Public draft boards, exhaustive transaction feeds, generic NFL player profiles and unsupported counterfactual lineup claims.

- ESPN imports and merging history across providers.
- Hosted registration, billing, or a service that manages multiple leagues in one deployment.
- Visitor accounts, member-only access, and social features that require authentication.
- Live scoring, lineup management, drafting, waivers, or other changes to the league through this site.
- Manually written recaps, uploaded photo collections, and a commissioner content-management interface.
- Subjective awards or personal stories that cannot be derived from the available data. A future content feature can add these without making them a dependency of the automatic museum.
- Betting, projections, recommendations about whom to start, and universal best-manager scores without an agreed method.
- Additional fantasy sports, a native mobile app, and a required language-model service.

## Further Notes

- Discovery on October 27, 2026 found eight linked Sleeper seasons, 2019 through 2026, with ten rosters in each season. Seven seasons are complete and 2026 is ongoing. The [2019 league](https://api.sleeper.app/v1/league/462265516384317440) has no previous-league reference; the [2026 league](https://api.sleeper.app/v1/league/1385327861673529344) is the starting point for the import. The end of this chain does not imply that the league began in 2019.
- Discovery sampled historical matchups, playoff brackets, drafts, and transactions. Those samples support the scope but are not a completeness audit. Initial import must assess actual coverage before treating every category as complete.
- Available season metadata shows scoring and format changes, including playoff start weeks and keeper settings. These are reasons to preserve season context and separate actual-score records from dominance comparisons.
- Source references: [official Sleeper API documentation](https://docs.sleeper.com/), [Fantasy Record Book feature reference](https://fantasyrecordbook.com/features), [2019 users](https://api.sleeper.app/v1/league/462265516384317440/users), [2020 users](https://api.sleeper.app/v1/league/601151745808195584/users), and [2021 users](https://api.sleeper.app/v1/league/726145943233236992/users). Fantasy Record Book is a capability reference; this project's museum direction and data rules come from the requirements discussion.
- Astro/TypeScript, History on Demand, the page families and shared responsive approach are selected. Hosting, persistence, refresh scheduling and the project license remain open implementation/setup choices.
- The public repository and GitHub Issues are configured at [samfarls55/fantasy_football_history](https://github.com/samfarls55/fantasy_football_history). Shared workflow configuration and the five triage labels are set up. The parent specification is published as issue #1. IMPLEMENTATION-PLAN.md indexes the published 18-ticket graph. Native GitHub blockers determine the ready frontier for the issue-based implement-spec workflow. Use native GitHub parent-child and blocking relationships. Sam's instruction requires a real ready-for-review PR when a PR is requested. Child tickets are published; full-platform implementation has not started.
