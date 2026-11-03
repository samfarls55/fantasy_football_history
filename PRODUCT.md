# Farls da bag league museum

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro and TypeScript serve the implemented museum from a durable atomic JSON publication on Node.js 24. Linked-season imports, all public route families and daily systemd refresh tooling are implemented. Project-authored code uses MIT. No public host, domain or scheduled service has been provisioned; see [docs/operations.md](docs/operations.md).

## Users

Current and former Farls da bag members want to revisit league history, compare careers, settle arguments and discover achievements and disasters. They often arrive through a shared link, on a phone or desktop browser. Anyone can visit without an account.

The operator needs automatic imports and useful internal reports of failures and source gaps. Open-source users need one configurable Sleeper league per deployment.

## Product Purpose

Create a public, automatically updated museum of the league's people, teams, games and consequential decisions. Success means discovering a distinctive record, opening its category rankings, following the relevant history and sharing the same filtered view. Routine operation must not require weekly manual entry or recap writing.

## Positioning

Specialized league history leads. Ordinary standings, scores and lineups provide context. The platform does not recreate the fantasy app's public draft board, full transaction feed or general NFL player pages.

Careers follow people through account and name changes. A separate franchise history preserves continuity and owner attribution across replacements. Calculations are reproducible and tested internally; visitors see results and actual historical destinations.

## Operating Context

- Main navigation is Records, Managers, Seasons, Rivalries. The brand returns Home. Managers also links to separate franchise histories.
- Home leads with six all-time categories and then recent events currently holding top-ten places. The two prominent features are Best season without a title and Highest-scoring benched player.
- Records groups plain category names into Careers, Seasons, Matchups and Players. A category opens its ranked page, initially ten places plus all cutoff ties and Show more. Entries link to actual career, season, game or scoped player history.
- Manager/franchise profiles use Seasons, Rivalries and Players tabs, with a takeover/name timeline above them. A manager timeline covers their tenure; the franchise timeline spans all owners.
- Season pages open Standings, with Matchups, Playoffs and Players alongside it. Keep context compact and season format in a closed disclosure.
- Rivalries compare two people. Player histories are scoped to a person or franchise and connect season totals with actual contributing games.
- Filters are page-local and shareable. Related links preserve context, main navigation opens defaults, and Back restores the earlier selection.

## Capabilities and Constraints

### Release scope

V1 serves one configured league per deployment. Farls da bag uses seed Sleeper league ID 1385327861673529344. Follow linked previous seasons and preserve provider IDs as strings. Keep the first provider read-only.

Include career records, championship history and playoff runs, manager/franchise timelines, season standings/formats, weekly matchups and available lineups, rivalries, starting-player contributions, productive pickups and dropped players' later contributions elsewhere.

Use source draft picks and completed transactions internally for ownership and contribution history. Omit standalone public draft boards and exhaustive transaction feeds. No trade-winner grade, draft-value formula or unsupported legal-substitution/missed-win claim is required.

Completed current-season results enter eligible career/game/player totals. Full-season awards wait for completion. Automatic refresh must reflect later corrections, be safe to repeat and retain the last successful published history on failure. Missing, empty, zero and unplayed remain distinct.

Do not add public calculation panels, source JSON, methodology dumps, operational status, freshness indicators or update dates. Keep methods, coverage and run diagnostics in code, tests and operator documentation. Actual event dates and missing-value states remain meaningful historical content.

### Identity and record rules

- Distinguish person, account, franchise, season roster, contest and player. Resolve roster IDs in their season. Default careers group by person.
- Woody14 to Timh17 at roster 7 in 2020 and alecswartout to sebastian12 at roster 10 in 2021 are confirmed changes between different people. Keep separate careers and continuous franchises.
- Show supported takeover, predecessor and team-name events. Today's name/avatar is not proof of past identity. Preserve provenance internally.
- Preserve official team totals, commissioner overrides, historical scoring and playoff settings. Player sums do not replace official team results.
- Regular season is the default. Combined includes only regular plus championship-path playoffs. Consolation and placement require explicit selection. Byes and multiweek legs do not create extra contest wins or titles.
- Career facts include W-L-T, rate with sample size, official points, championships and playoff appearances. Rates need one eligible game, with no extra cutoff.
- Use competition ranks and shared ties. Career categories have one aggregate per person; game and season categories rank performances and may repeat people.
- Dominance compares regular-season PPG with that season's league PPG. Unluckiest season uses expected wins minus actual wins, while the season table shows actual minus expected.
- Contributions count actual recorded starts for the selected person/franchise. Keep bench points separate. Pickup/drop rules use distinct source-supported ownership spells and same-season windows.
- Use [docs/metrics.md](docs/metrics.md) for precise eligibility, sorting, precision, streak, nemesis and attribution rules. No public method page is implied.

### Boundaries and open decisions

ESPN imports, provider-history merging, hosted multi-league management, visitor accounts, billing, league-management actions, live scoring, a commissioner CMS, manual recaps, photo collections and unsupported subjective awards are outside v1. Betting, projections, lineup recommendations, other fantasy sports, a native app and runtime language-model calls are also outside scope.

The repository and task graph are on GitHub. [ADR 0001](docs/adr/0001-local-node-delivery.md) records standalone Node delivery, durable JSON, daily locked systemd refresh and MIT. [docs/coverage.md](docs/coverage.md) records the bounded eight-season source audit and approved later-full-week move policy. Host provisioning and deployment-specific timer checks remain conditional on an available target. Final independent implementation/visual review and release disposition remain in progress.

## Brand Commitments

The league name is Farls da bag. The approved visual world is History on Demand, a desktop-led responsive sports museum with complete team images, dark condensed headings, violet actions and quiet aqua/lilac grouping.

Use one consistent header and title system across pages. Images and initials fit padded rounded frames. Preserve original artwork; generated likenesses are layout references only. Avoid taglines, redundant helper text, opaque exhibit labels, large context blocks and appended generic summaries.

Sam accepted the synthetic Home prototype on October 30, 2026. The full-platform walkthrough approved the expanded Home, profile B, historical-detail/collection/bracket families and shared mobile approach. Revised season Q35 is an accepted working foundation; detailed mobile polish is deferred to implementation. Q38 uses the cleaned lineup image without the separate record callout.

The existing prototype's inline public evidence reveal is superseded for the full platform. Keep its established visual system while implementing the category-first flow in [DESIGN-BRIEF.md](DESIGN-BRIEF.md). Sam confirmed the written handoff at Q44 on November 3, 2026. The design walkthrough is complete; implementation follows the separate implement-spec workflow.

## Evidence on Hand

- [SPEC.md](SPEC.md) is reconciled with the walkthrough. [DESIGN-BRIEF.md](DESIGN-BRIEF.md) gives route/state/responsive contracts and the selected image index. [DESIGN.md](DESIGN.md) records existing visual tokens, with current applicability stated above its historical prototype documentation.
- [docs/requirements.md](docs/requirements.md) tracks all original 54 stories and six additions. [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md) gives local tickets and explicit dependencies.
- Discovery on October 27, 2026 found eight linked seasons, 2019 through 2026, with ten rosters each; seven seasons were complete and 2026 ongoing at that inspection. This is dated research, not proof of complete coverage or the league's founding year.
- The cached eight-season source replay passes through the real refresh into a durable archive. Controlled provider tests establish corrections, completed-week updates, exact ranks, attribution and failure retention; [docs/verification.md](docs/verification.md) records the final acceptance checks.
- Public routes read the persisted publication, including six-category Home discovery, all record categories, people/franchises, seasons/brackets/matchups, rivalries and scoped player histories. No synthetic public fallback route remains.
- Current team artwork comes from supplied/source assets. Mockup statistics, identities, timelines and dates remain fictional examples.
- The public repository and GitHub Issues are configured at samfarls55/fantasy_football_history. Spec #1 and children #2–#19 are published with native relationships. Feature children #2–#18 are closed; #19 and the parent await final independent review and release handling. No deployment has been performed.

## Product Principles

1. Keep careers attached to people and attribute franchise results to their actual owners.
2. Lead with distinctive league records and connect them to actual history.
3. Preserve official scores, season context, scopes, ties and unknown values.
4. Make automatic refresh repeatable and keep the last good archive readable through failures.
5. Use consistent desktop-led layouts and readable phone patterns, with layout carrying the explanation.
