# Farls da bag league museum

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro with TypeScript, confirmed for the first build. Hosting and database decisions remain open. Keep these decisions separate from the agreed product behavior in [SPEC.md](SPEC.md).

## Users

The primary users are current and former members of Farls da bag. They want to revisit league history, compare careers, settle arguments, and discover memorable achievements and disasters. They often arrive on a phone through a link in the league group chat.

Anyone with a link can visit without an account. The league operator needs automatic imports and clear reports of failures or missing history. Future open-source users should be able to configure their own league without changing the record calculations.

## Product Purpose

Create a public, automatically updated museum of the people, teams, games, and decisions that make this league its own. Success means visitors can discover a story, inspect the results behind it, and share the same evidence. Routine operation must not require weekly data entry or manually written recaps.

## Positioning

The museum connects records to the league's people and history. Career results follow a person across seasons and team-name changes. Separate franchise histories preserve continuity across ownership changes.

Calculated exhibits turn the available results into league stories. Every claim needs a reproducible method and links to the games, seasons, or players behind it. Personality comes from the league's actual achievements and misfortunes.

## Operating Context

- Visitors discover notable history on the home page or browse records, manager and franchise profiles, rivalries, seasons, matchups, drafts, transactions, and player contributions.
- A record or exhibit leads to its calculation, eligibility, sample size, and supporting history. Profiles and archive views connect related results.
- Regular-season records are the default. Visitors can select championship-path playoff records or a combined view. Consolation and placement results require an explicit selection.
- Profiles, records, seasons, rivalries, and games have stable, directly shareable links. Shared links must reproduce the relevant result without a login.
- The operator imports linked Sleeper seasons and refreshes completed weeks from the current season. Later corrections update affected records and exhibits.

## Capabilities and Constraints

### Release scope

V1 serves one configured league per deployment. The initial league is Farls da bag, with Sleeper seed league ID `1385327861673529344`. Use documented, read-only Sleeper data and follow each season's previous-league reference to discover history. Keep provider identifiers as strings.

The archive covers career statistics and leaderboards, championships and playoff runs, season standings and formats, weekly matchups and available lineups, rivalries, drafts, completed transactions, and player contributions. Records include scoring extremes, streaks, close games, and blowouts.

The current season joins the archive as weeks are completed. Live scoring is not required. Initial import and refresh must be repeatable, reflect later corrections, and retain the last successful history through source outages. Show update status and coverage gaps. Missing data, genuine zeros, unplayed games, and empty activity are different states.

### Identity and record rules

- Distinguish a person, Sleeper account, franchise, season roster, matchup, and player. Interpret roster identifiers within their league season. Default career queries group results by person.
- Woody14 to Timh17 in 2020 at roster 7 and alecswartout to sebastian12 in 2021 at roster 10 are confirmed changes between different people. Preserve separate careers and the corresponding franchise ownership periods.
- Preserve available historical names and their provenance. Today's account names do not establish past display names. Retain identity provenance for a later provider-history merge.
- Preserve official team scores, commissioner overrides, and each season's scoring and playoff settings. Player-score sums do not necessarily reproduce official team results.
- Separate regular-season, championship-path playoff, consolation, and placement games. The combined view includes only regular-season and championship-path playoff results. Resolve championships from championship results. Byes, placement wins, and individual weeks of a multiweek contest must not create extra titles or independent playoff wins.
- Keep actual scores for official records. Compare season dominance using points per played regular-season game against that season's league-wide points per team-game. Distinguish ongoing seasons from completed seasons.
- Calculate retrospective schedule comparisons against the other teams' scores in the same completed week, with half credit for ties. This measure is not a prediction. SPEC.md defines the proposed expected-win calculation.
- Count player contributions from starting-lineup points for the selected manager or franchise. Keep bench points separate. Describe an unused substitution as avoidable only when historical lineup rules and eligibility establish that it was legal.
- Preserve shared records as ties. Show sample sizes with rates and explain eligibility and minimum-sample rules. Use consistent calculations across profiles, leaderboards, exhibits, and detail views.
- Preserve draft pick order, player identities, and available keeper designations. Transaction history includes completed moves and their recorded assets. Do not invent trade-winner or draft-value formulas.

### Exhibits

Proposed exhibits include Uncrowned Kings, Schedule Victims, Public Enemy No. 1, Franchise Legends, and Bench Crimes. Uncrowned Kings uses season dominance among completed seasons without a championship. Public Enemy No. 1 needs a documented opponent-ranking rule for the selected head-to-head scope. All exhibits must expose their supporting records and calculation rules.

### Boundaries and open decisions

ESPN imports and provider-history merging are deferred. V1 excludes hosted multi-league management, visitor accounts, billing, league-management actions, live scoring, a commissioner CMS, manually authored recaps, photo collections, and subjective awards unsupported by data. It does not require a language-model service. Betting, projections, lineup recommendations, other fantasy sports, and a native mobile app are outside scope.

Hosting, database architecture, the open-source license, refresh mechanism and cadence, final exhibit names, and designs for the remaining archive pages remain undecided. Astro and TypeScript are confirmed for the first build. Metric-specific ranking and minimum-sample rules must be documented when implemented. [SPEC.md](SPEC.md) remains the detailed authority for behavior, calculations, scope, and testing.

## Brand Commitments

The league name is Farls da bag. The product concept is a league museum with playful football language supported by evidence. Ring of Honor, Hall of Pain, and the proposed exhibit names are working names.

Use clear navigation and layout. Cut taglines, redundant helper text, and secondary labels. If a screen needs them to make sense, fix its layout. The implemented visual system is recorded in [DESIGN.md](DESIGN.md).

Use real team images alongside names and meaningful icons to keep the page lighter and less text-dense. Preserve full logos by default; enlarged crops are optional. The approved home-page direction is History on Demand, with light, contemporary sports presentation.

The home page is desktop-led and responsive. Compose it for a wide web browser first, with supporting records visible alongside the lead exhibit. Mobile adapts from that hierarchy. Do not enlarge a narrow phone layout to fill a desktop window.

Sam accepted the implemented home-page prototype on October 30, 2026, after the rounded-image and simplification changes. Carry its design and basic interactions forward; further visual refinements are deferred. The prototype uses sample records. Real league history, automatic imports, and the remaining archive pages still need implementation.

## Evidence on Hand

- [SPEC.md](SPEC.md) is the confirmed product brief. It includes user stories, domain rules, implementation constraints, source references, and the agreed testing boundary.
- The spec records discovery on October 27, 2026 of eight linked Sleeper seasons, 2019 through 2026, with ten rosters per season. Seven seasons were complete and 2026 was ongoing. This is a dated discovery result, not a guarantee of complete coverage or the league's founding date.
- Discovery sampled historical matchups, playoff brackets, drafts, and transactions. Initial import must assess actual coverage before presenting any category as complete.
- The two ownership replacements above are confirmed identity evidence. Source names alone must not create additional identity claims.
- Fantasy Record Book is a capability reference in the spec. It does not establish this project's visual direction or override its museum concept and data rules.
- At initialization, the workspace contains the spec and no application, imported dataset, or supplied brand assets. Future screens must not present invented league statistics or stories as factual history.

## Product Principles

1. Keep careers attached to people and make franchise ownership changes explicit.
2. Make every record and league story traceable to its method and supporting history.
3. Preserve season context, game scope, ties, and uncertainty so comparisons do not rewrite history.
4. Let the archive grow automatically and remain readable when updates fail.
5. Make discovery, comparison, and sharing clear on a phone, with layout carrying the explanation.
