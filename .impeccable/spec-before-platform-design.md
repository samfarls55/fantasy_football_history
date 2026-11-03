# Fantasy football league museum v1

## Problem Statement

Our league's history is spread across seasons in Sleeper. We want one place to see how everyone has done, revisit old matchups, settle arguments, and find things we wouldn't have thought to look for. A list of standings alone won't do that. The site should feel like a museum of the people, teams, achievements, and disasters that make this league ours.

The league previously used ESPN. Combining that history with Sleeper is a later project. The first version needs to make the available Sleeper history useful without creating another thing somebody has to maintain every week.

## Solution

Build a public, automatically updated league museum for Farls da bag. Visitors can explore career records, championships, manager and franchise profiles, rivalries, season archives, drafts, transactions, and player contributions. The current season joins the museum as weeks are completed.

Careers belong to people. Franchise views preserve continuity when a different person takes over a team. Regular-season records are the default, with separate playoff records and an option to combine them. Consolation and placement results remain distinguishable.

The museum should also discover stories in the results. Ring of Honor and Hall of Pain are working names for its accomplishments and misfortunes. Proposed exhibits include Uncrowned Kings, Schedule Victims, Public Enemy No. 1, Franchise Legends, and Bench Crimes. Each exhibit explains its calculation and links to the games, seasons, or players behind it.

The project will be open source and configured for this league first. Anyone with a link can visit without an account.

## User Stories

1. As a league member, I want to visit the museum without creating an account, so that I can open it directly from the group chat.
2. As a visitor, I want the museum to work on my phone, so that I can browse history wherever a league argument starts.
3. As a league member, I want the home page to surface notable achievements and disasters, so that I can discover history without knowing which statistic to search for.
4. As a league member, I want to share a direct link to a record, profile, season, rivalry, or game, so that other people can see the same evidence.
5. As a league member, I want all available linked Sleeper seasons included, so that career records reflect the league's available history.
6. As a league member, I want completed weeks from the current season included automatically, so that new records become part of the museum during the season.
7. As a league member, I want ongoing seasons identified clearly, so that partial results aren't presented as completed seasons.
8. As a manager, I want a career profile that follows me across seasons and team-name changes, so that my achievements remain connected to me.
9. As a former manager, I want my career preserved after I leave, so that my history isn't reassigned to my replacement.
10. As a league member, I want a separate franchise view, so that I can follow a team's history across ownership changes.
11. As a league member, I want ownership changes shown in the franchise history, so that I can tell who earned each result.
12. As a league member, I want available season-specific team names preserved with honest source limitations, so that the archive stays recognizable without inventing historical names.
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
29. As a league member, I want rivalry records, scoring margins, streaks, and individual games, so that the rivalry has evidence behind its reputation.
30. As a manager, I want to see my biggest nemesis through Public Enemy No. 1, so that I can discover which opponent has caused me the most trouble.
31. As a league member, I want actual historical scores retained, so that official records continue to reflect the rules used at the time.
32. As a league member, I want dominance comparisons against each season's league average, so that scoring eras and different season lengths don't determine every comparison.
33. As a manager, I want to compare actual results with results against the rest of the league's weekly scores, so that I can understand the effect of my schedule.
34. As a league member, I want Schedule Victims to identify strong scoring that produced disappointing results, so that unlucky seasons are remembered.
35. As a league member, I want Uncrowned Kings to identify dominant completed seasons that ended without a championship, so that great teams aren't forgotten just because they lost in the playoffs.
36. As a manager, I want Franchise Legends to show the players who contributed the most points to my career, so that I can recognize the players associated with my history.
37. As a league member, I want Bench Crimes to surface big performances left out of starting lineups, so that memorable lineup decisions become part of the archive.
38. As a league member, I want playful exhibit names supported by clear statistics, so that the museum has personality and remains credible.
39. As a league member, I want every calculated award to explain its method and eligibility, so that I can understand why someone received it.
40. As a league member, I want draft boards with rounds, pick order, players, managers, and available keeper designations, so that I can revisit how teams were assembled.
41. As a manager, I want to follow drafted players into their recorded contributions, so that the draft archive connects to what happened afterward.
42. As a league member, I want completed trades, waivers, and free-agent moves preserved, so that roster decisions are part of the league's history.
43. As a league member, I want unsuccessful transaction attempts excluded from completed activity, so that the archive reflects moves that actually happened.
44. As a manager, I want player contributions connected to the relevant seasons and matchups, so that I can inspect the history behind a player total.
45. As a league member, I want later score corrections reflected in records and exhibits, so that the museum stays consistent with official results.
46. As a league member, I want unplayed games and incomplete results kept out of finalized records, so that zero scores or unfinished weeks don't create false achievements.
47. As a visitor, I want missing history distinguished from a genuine zero or no activity, so that an incomplete import doesn't mislead me.
48. As a visitor, I want the last successful update visible, so that I can judge how current the museum is.
49. As a visitor, I want previously imported history to remain available when Sleeper is temporarily unavailable, so that a source outage doesn't empty the museum.
50. As a league operator, I want the initial history import and later updates to run automatically, so that routine maintenance doesn't require manual data entry.
51. As a league operator, I want imports to be safe to repeat, so that retries don't duplicate games, transactions, or championships.
52. As a league operator, I want import failures and coverage gaps reported clearly, so that I can resolve data problems without auditing every page.
53. As an open-source user, I want documented setup with a configurable Sleeper league ID, so that I can run the project for a league without changing its record calculations.
54. As a contributor, I want documented domain rules and deterministic tests through the application boundary, so that I can change the project without quietly rewriting league history.

## Implementation Decisions

- V1 serves one configured league per deployment. The initial league is [Farls da bag](https://sleeper.com/leagues/1385327861673529344/), with seed league ID `1385327861673529344`. Hosted signup and management of multiple leagues are outside this release.
- Use documented, read-only Sleeper data for the first provider. Follow each season's previous-league reference to discover its linked history. Keep provider identifiers as strings to preserve their full precision.
- The workspace is currently empty. There is no framework, database, module layout, domain glossary, ADR, or testing convention to preserve. This spec establishes the product behavior without selecting a technology stack.
- The application needs responsibilities for importing source data, resolving manager and franchise identities, calculating records and exhibits, and presenting public history. These are logical responsibilities within the application; their interfaces should support a single import-to-visitor test boundary.
- Distinguish a person, a Sleeper account, a franchise, a season roster, a matchup, and a player. Account identity and roster identity must not be treated as interchangeable. Roster identifiers are interpreted in the context of their league season.
- Default career queries group results by person. Franchise queries follow the league's roster continuity and expose ownership periods. Preserve enough source identity and provenance to support later history merging without implementing ESPN support now.
- Two confirmed changes represent different people: Woody14 to Timh17 in 2020 at roster 7, and alecswartout to sebastian12 in 2021 at roster 10. Keep these careers separate while retaining the corresponding franchise histories. Account names returned today are not proof of historical display names.
- Preserve source results, available historical lineups, scoring settings, and playoff settings by season. Respect official team scores and commissioner overrides rather than assuming that summing player scores always reproduces the official team result.
- Distinguish regular-season games, championship-path playoff games, consolation games, and placement games. Regular-season records are the default. The combined view includes regular-season and championship-path playoff results; consolation and placement results require an explicit selection.
- Determine titles from resolved championship results. Do not count byes, placement wins, or individual weeks of a multiweek contest as additional championships or independent playoff victories.
- Preserve actual scores for official scoring records. For season dominance, compare points per played regular-season game with that season's league-wide points per team-game. Clearly distinguish a completed season from an ongoing one.
- Calculate schedule comparisons from the other teams' scores in the same completed week. The proposed expected-win calculation gives a team the fraction of other teams it outscored, with half credit for tied scores, then sums those fractions across eligible weeks. This is a retrospective schedule measure, not a prediction.
- Rank Uncrowned Kings using the documented season-dominance measure among completed, nonchampionship seasons. Public Enemy No. 1 uses the selected head-to-head scope and a documented opponent-ranking rule. Show the underlying record and sample size with any label.
- Count player contributions from points earned in starting lineups for the selected manager or franchise scope. Keep bench performances separate. Only describe a Bench Crimes substitution as avoidable when lineup rules and the available historical eligibility data establish that it was legal.
- Draft views preserve pick order, player identity, and available keeper designations. Transaction history includes completed moves and their recorded assets. V1 does not require an invented trade-winner or draft-value formula.
- Ring of Honor, Hall of Pain, and individual exhibit names are working names. The accepted direction is playful football language with evidence behind every claim. Use clear navigation and layout; avoid taglines and redundant helper labels.
- Initial import and ongoing updates must be repeatable. Completed current-season weeks join the archive, later corrections recalculate affected results, and incomplete weeks do not enter finalized records. The refresh mechanism and cadence are implementation choices; live scoring is not required.
- Retain the last successful imported history if a later source request fails. Track coverage and update status. Missing source data must remain distinguishable from a zero, an unplayed game, or an empty transaction week.
- Public pages and individual historical results need stable, directly shareable links. Viewing requires no account. The site should remain usable on mobile screens.
- Awards and league stories in v1 are generated from the available data. Runtime language-model calls and manual recap authoring are not required for the museum to operate.
- Document calculated metrics, eligible game scopes, ties, and any minimum-sample rules alongside the feature. Keep those rules consistent between profiles, leaderboards, exhibits, and their supporting detail views.

## Testing Decisions

- Confirmed test boundary: exercise the application from controlled Sleeper responses through its real import or refresh entry point, then inspect the resulting public history. Prefer this one application boundary over tests coupled to the internal module layout.
- A good test supplies a small, understandable history and checks what an operator or visitor can observe. It should establish an actual result, such as the correct champion, a separate replacement-manager career, or a corrected record. It should not mirror private functions, assert internal call sequences, or depend on the live league changing in a particular way.
- There is no existing test suite or test prior art in this workspace. Build deterministic, synthetic fixtures that follow the documented source shapes. The actual league can be used for a bounded import check, but live requests should not be required for routine regression tests.
- Exercise the importer, identity handling, record calculations, exhibit calculations, and public read views through the same application boundary. Use browser checks for visitor behavior such as following a record to its supporting matchup and opening a shared link on a mobile viewport.
- Cover an import across linked seasons and assert that the earliest reachable season, all included seasons, and coverage gaps are reported correctly.
- Cover an ownership replacement and a team-name change. Assert that the replacement does not inherit the departing person's career and that the franchise view retains both ownership periods.
- Cover regular-season, playoff, consolation, and placement results. Assert that default, playoff-only, and combined totals use the intended games, and that a bye or multiweek playoff contest doesn't produce extra wins.
- Cover a completed championship and an unfinished current season. Assert the correct champion and runner-up for the completed season and no invented title for the unfinished season.
- Cover changed scoring rules, different season lengths, ties, and a commissioner-adjusted score. Assert accurate official records and separately reproducible season-dominance comparisons.
- Cover expected wins with a hand-calculated week, then follow a Schedule Victims result to the exact scores used in its calculation.
- Cover starter points, bench points, and an ineligible substitution. Assert correct player contributions and prevent an unsupported claim that an illegal lineup change would have improved a result.
- Cover keeper picks, successful transactions, and unsuccessful attempts. Assert that the draft and transaction archive accurately distinguish them.
- Import the same history twice and assert unchanged observable totals. Apply a later score correction and assert that affected standings, records, rivalries, and exhibits update without duplicate history.
- Cover an unplayed game, an incomplete response, and a failed source request. Assert that none becomes a false zero-score record and that the last successful history remains readable with an accurate update or coverage status.
- Verify that calculated awards expose their method, ties, sample sizes, and supporting records. Verify that shared links reproduce the relevant result without requiring a login.

## Out of Scope

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
- The technology stack, hosting, open-source license, final visual design, and final exhibit names have not been selected. Implementation should keep these choices separate from the agreed identity and record rules.
- This is the local publication draft. Sam confirmed the test boundary. No project issue tracker or repository remote is configured. Run `/setup-matt-pocock-skills` to establish the issue-tracker destination and triage vocabulary, then publish this spec as one issue with the `ready-for-agent` label.
