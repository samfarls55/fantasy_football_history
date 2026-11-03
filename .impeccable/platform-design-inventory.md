# Platform design inventory

Status: DRAFT RESEARCH. This file records requirements and local evidence. It is not an approved sitemap, design, calculation policy, or ticket graph.

November 3 handoff note: this is the pre-reconciliation research inventory. Current scope is in ../SPEC.md and ../DESIGN-BRIEF.md; all original stories are reconciled in ../docs/requirements.md. The local task graph now exists in ../IMPLEMENTATION-PLAN.md. Older public method/status/draft/feed proposals and earlier setup statements below are historical.

Inspected October 30, 2026. Workspace: `C:/dev/active/fantasy_football_history`.

## Authority and limits

- `SPEC.md` defines v1 behavior, 54 stories, domain rules, scope, and the agreed application test boundary. `PRODUCT.md` records later confirmed stack and prototype decisions. `DESIGN.md` documents the implemented home-page visual system. `.impeccable/surfaces/src-pages-index-astro.md` records the accepted home-page refinements.
- The home-page prototype was accepted on October 30, 2026. That acceptance covers its design and basic interactions with sample records. Further visual polish is deferred, and the inherited Impeccable receipt problem is separate from that acceptance. Sources: `PRODUCT.md:80`; surface brief `:57-61`.
- Research used local files, installed-tool version checks, Git read commands, and local process/listener inspection. No network requests, issue creation, application changes, test reruns, or review-image inspection occurred.
- All source pointers below are relative to the workspace unless they name a full skill path. Line numbers refer to the inspected files. Story numbers refer to `SPEC.md:21-74`.

## Requirement coverage by domain

These groups organize the inventory only. They do not decide the site's navigation or page boundaries. Every story from 1 through 54 appears below.

### Public entry, discovery, and sharing

| Stories | Required visitor capability | Current evidence |
| --- | --- | --- |
| 1 | Open the museum without an account. | Home is public static Astro. No account flow exists. |
| 2 | Browse on a phone. | Accepted home adapts to desktop, tablet, and phone. Other archive views do not exist. |
| 3 | Discover notable achievements and disasters on home. | Accepted gallery has two synthetic featured records and a compact recent link. Real discovery selection is not implemented. |
| 4 | Share a stable direct link to a record, profile, season, rivalry, or game that reproduces the relevant evidence. | Only sample-record query links exist. No profile, season, rivalry, or game route exists. |

Sources: `SPEC.md:21-24,93,96`; `PRODUCT.md:31-34,74-80`; `src/pages/index.astro:19-82`; `src/scripts/home.ts:15-81`.

### History coverage, freshness, and truthful data states

| Stories | Required capability | Current evidence |
| --- | --- | --- |
| 5 | Include all reachable linked Sleeper seasons and report actual coverage. | No importer or imported history. The documented 2019-2026 discovery is dated research, not a completeness guarantee. |
| 6 | Add completed current-season weeks automatically. | No refresh or schedule exists. |
| 7 | Identify an ongoing season so partial results do not look complete. | No season archive exists. Synthetic season fixture is marked complete. |
| 45 | Reflect later score corrections in standings, records, rivalries, and exhibits. | No correction flow exists. |
| 46 | Exclude unplayed games and incomplete results from finalized records. | No imported results exist. |
| 47 | Distinguish missing history from genuine zero, no activity, or unplayed results. | Prototype says history is unimported and labels scope emptiness as sample-specific. Broader data-state presentation is undefined. |
| 48 | Show last successful update. | Fixture has `lastSuccessfulUpdate: null`; home says history has not been imported. No successful import timestamp is displayed. |
| 49 | Keep last successful imported history readable during a source outage, with accurate update or coverage status. | No persistent history or failure flow exists. |

Sources: `SPEC.md:25-27,65-69,94-95,106,114-115,131-133`; `PRODUCT.md:45,85-86`; `assets/data/sample-history.ts:1-9`; `src/pages/index.astro:108`.

### People, careers, franchises, and identity

| Stories | Required visitor capability | Current evidence |
| --- | --- | --- |
| 8, 9 | Open a person's career across seasons and team-name changes, including former managers. A replacement must not inherit another person's career. | No manager profiles or identity resolver. |
| 10, 11 | Open a separate franchise history across owners and see who earned each period's results. | No franchise views or ownership timeline. |
| 12 | See available season-specific names with honest source limitations. | Only current sourced team names/images are used. They explicitly make no historical identity claim. |
| 13 | Read career wins, losses, ties, win percentage, points, and championships. | No actual career totals. |
| 23 | See playoff appearances and championship runs on manager profiles. | No profile or championship history. |

Required identity distinctions are person, Sleeper account, franchise, season roster, matchup, and player. Roster IDs are scoped to a league season. Default career queries group by person. Woody14 to Timh17 in 2020 at roster 7 and alecswartout to sebastian12 in 2021 at roster 10 are confirmed changes between different people. Current account names do not prove historical display names. Sources: `SPEC.md:28-33,43,82-85,107`; `PRODUCT.md:49-52`; `README.md:32`.

### Records, leaderboards, and game scopes

| Stories | Required visitor capability | Current evidence |
| --- | --- | --- |
| 14 | Sort leaderboards by the selected statistic. | Prototype record index is fixed order and has no sorting. |
| 15 | See sample sizes with rate statistics. | Sample evidence includes coverage/counts. Sam explicitly removed played-game counts from the home gallery; they remain in evidence. No general leaderboard/profile treatment exists. |
| 16, 17, 18 | Start with regular-season records; select championship playoffs or combined results; select consolation and placement explicitly. | Native select filters three sample table rows. Five scope values exist. The gallery stays explicitly regular-season while only the record table changes. |
| 19 | Browse scoring highs/lows, winning/losing streaks, close games, and blowouts. | Only sample dominance, benched-player high, and playoff scoring high are present. |
| 20 | Display shared records as ties rather than inventing a winner. | Sample facts say no ties. A multi-holder record presentation is not implemented. |
| 21 | Follow each leaderboard result to its supporting history. | Sample record names reveal methods, facts, and a JSON fixture. They do not lead to actual historical games. |
| 31 | Retain official historical scores under the rules of their season. | Sample playoff evidence states official team score precedence. No source import exists. |

The combined scope means regular season plus championship-path playoffs only. It excludes consolation and placement without explicit selection. Byes and individual weeks of a multiweek contest must not create extra playoff wins or titles. Sources: `SPEC.md:34-41,51,85-87,98,108,110,116`; surface brief `:18`; `src/lib/records.ts:3-9,47-60`; `src/scripts/home.ts:17-26`; `src/pages/index.astro:28,68-83`.

### Championships, seasons, weeks, and games

| Stories | Required visitor capability | Current evidence |
| --- | --- | --- |
| 22 | Browse champions and runners-up by year. | Not implemented. A current team name containing Champion is explicitly not championship evidence. |
| 24 | Revisit historical playoff brackets and results. | Not implemented. |
| 25 | Read a season's standings and the format used that year. | Not implemented. |
| 26 | Browse a season by week and matchup. | Not implemented. |
| 27 | Inspect historical official scores, starters, bench players, and available player points. | Not implemented beyond synthetic JSON examples. |

Seasons must preserve scoring and playoff settings, official scores, commissioner overrides, and available lineups. Titles come from resolved championship results. An ongoing season cannot receive an invented champion. Sources: `SPEC.md:42-47,85,87,109-110`; `PRODUCT.md:52-54`; `assets/data/sample-history.ts:17-20`.

### Rivalries and schedule comparisons

| Stories | Required visitor capability | Current evidence |
| --- | --- | --- |
| 28, 29 | Compare two managers' head-to-head record, scoring margins, streaks, and individual games. | No rivalry view or pair-selection UI. |
| 30 | Discover the opponent causing the most trouble through Public Enemy No. 1, with underlying record and sample size. | Not implemented. Opponent-ranking rule remains unspecified. |
| 32 | Compare season dominance against that season's league scoring average rather than raw totals alone. | One synthetic +24% result and calculation exist. No multi-season comparison. |
| 33 | Compare actual results with results against the other teams' scores in the same completed weeks. | Not implemented. |
| 34 | Find Schedule Victims and inspect the scoring evidence behind disappointing outcomes. | Not implemented. Final ranking of this exhibit is unspecified. |

Sources: `SPEC.md:48-54,88-90,111`; `PRODUCT.md:54-55,62`; `src/lib/records.ts:12-29`.

### Calculated exhibits and evidence

| Stories | Required visitor capability | Current evidence |
| --- | --- | --- |
| 35 | Find dominant completed seasons without a championship through Uncrowned Kings. | Accepted public home name is Best season without a title. One synthetic record exists, with method and eligibility. |
| 36 | Find the players contributing the most starting-lineup points to a manager's career through Franchise Legends. Manager and franchise contribution scopes must remain distinct. | Not implemented. |
| 37 | Find high-scoring benched performances through Bench Crimes. Claim an avoidable legal substitution only when historical rules and eligibility support it. | Accepted public home name is Highest-scoring benched player. Synthetic Sample receiver has 38.7 points. Evidence expressly says legal substitution eligibility is unavailable. |
| 38 | Use playful football language backed by clear statistics. | Working exhibit names are not final global navigation labels. The accepted home uses plain category names. |
| 39 | Inspect method, eligibility, ties, sample size, and supporting records for every calculated award. | Sample inline evidence includes method, facts, counts, identity limitation, JSON, and a copy link. Platform-wide evidence contracts remain undefined. |

Sources: `SPEC.md:55-59,90-91,93,98,112,116`; `PRODUCT.md:62,72-76`; surface brief `:12,18,22,30`; `src/pages/index.astro:85-106`; `src/lib/records.ts:16-45`.

### Drafts, transactions, and player contributions

| Stories | Required visitor capability | Current evidence |
| --- | --- | --- |
| 40 | Inspect draft boards with rounds, pick order, players, managers, and available keeper designations. | Not implemented. |
| 41 | Follow a drafted player into recorded contributions. | Not implemented. |
| 42, 43 | Inspect completed trades, waivers, free-agent moves, and recorded assets. Exclude unsuccessful attempts from completed activity. | Not implemented. |
| 44 | Follow a player's starting-lineup point contributions into the relevant seasons and matchups. | Not implemented. |

No invented trade-winner or draft-value formula is required. Contribution totals use selected manager or franchise scope and keep bench points separate. A standalone player profile, draft-pick detail route, or transaction detail route is not mandated by the text; usable links to the required evidence are mandated. Sources: `SPEC.md:60-64,91-92,112-113`; `PRODUCT.md:56,58`.

### Operation, setup, and contribution

| Stories | Required capability | Current evidence |
| --- | --- | --- |
| 50 | Automatically run initial import and later updates without routine manual entry. | No import entry point or scheduler exists. |
| 51 | Repeat imports safely without duplicate games, transactions, or championships. | No import or durable storage exists. |
| 52 | Clearly report import failures and coverage gaps to the operator. | No import reporting exists. This does not require a commissioner CMS or a new operator dashboard. |
| 53 | Document setup and make the Sleeper league ID configurable without changing record calculations. | README documents running the sample app. The seed ID exists in a hardcoded synthetic fixture. No real league configuration is implemented. |
| 54 | Document domain rules and test deterministically through the application boundary. | Spec contains domain/test rules, but only six home-page browser tests exist. No import-to-public-history suite exists. |

Sources: `SPEC.md:70-74,78-81,94-95,100-116`; `README.md:5-34`; `assets/data/sample-history.ts:6-8`; `tests/home.spec.ts`.

## Settled rules and implementation freedom

| Settled requirement | What it does not decide |
| --- | --- |
| Entire v1 covers all domains above, one configured league per deployment, public read-only access. | It does not decide the navigation labels, number of routes, or page grouping. |
| Stable direct links reproduce records, profiles, seasons, rivalries, and games. | It does not prescribe path syntax, tab/query/hash conventions, or whether evidence is inline or a dedicated page. |
| Manager career and franchise continuity are separate concepts and views. | It does not prescribe two separate top-level navigation sections or a specific switcher. |
| Scope defaults and combined-game membership are defined. | It does not decide local versus site-wide filters, filter persistence across links, or every control's placement. |
| Every award exposes method, eligibility, samples, ties, and supporting history. | It does not require long explanatory copy on every record card. Home counts are already assigned to evidence. |
| Historical facts preserve identity, season rules, official results, and uncertainty. | It does not prescribe a display-name fallback hierarchy or the appearance of provenance and coverage indicators. |
| Initial import/refresh are repeatable, automatic, correction-aware, and keep good history through outages. | Refresh mechanism and cadence are explicitly implementation choices. Storage, hosting, and failure-report delivery remain open. |
| Astro and TypeScript, accepted home design and interactions, original complete images, concise copy, responsive use. | Home gallery proportions and its reference-canvas scaling are not compulsory templates for other pages. |
| Deterministic controlled Sleeper responses through a real import/refresh entry point into public history, plus visitor browser checks. | Internal module layout and private-function tests are not prescribed. |

Sources: `SPEC.md:78-98,102-116`; `PRODUCT.md:11,68,74-80`; `DESIGN.md:138,186,192-194,222,254`.

Explicitly excluded: ESPN/provider-history merging, hosted multi-league service, visitor accounts, billing, social authentication features, live scoring, league-changing actions, commissioner CMS, manual recaps, uploaded photo collections, unsupported subjective awards, betting, projections, lineup recommendations, universal best-manager scores without a method, other sports, native mobile app, required runtime language-model calls. Source: `SPEC.md:118-127`.

## Open product and UX decisions

These are gaps in the inspected documents, not decisions made by this inventory.

1. **Sitemap and navigation.** Grouping of people/franchises, records/exhibits, seasons/championships, rivalries, drafts, transactions, and contributions; primary versus season/profile-local navigation; canonical routes; current location and back-navigation behavior. The three current header links are home anchors, not an approved platform sitemap.
2. **Page and evidence boundaries.** Which required historical entities receive dedicated detail pages, which appear inside a season/profile, and how record evidence leads to source seasons/games/players. Directly shareable profiles, seasons, rivalries, games, and record results are required as destinations; their exact route and presentation architecture is open.
3. **Representative design coverage and completion bar.** Only home is accepted. No approved archive, profile, rivalry, bracket, game, draft, transaction, contribution, or platform-status layout exists. The documents do not state how many representative pages or data states must be reviewed before implementation starts.
4. **Screen contracts.** Per family: primary task, visible fields, available scopes, sorting/filter behavior, cross-links, selection state in shared URLs, ties, pagination or large-history treatment if needed, and responsive layout. The spec requires capabilities, not a specific mechanism for every list.
5. **Data-state presentation.** Where to show coverage gaps, last successful update, stale history after failed refresh, ongoing seasons, incomplete lineups/player points, unavailable historical names/assets, no eligible record, and tied holders. The semantic distinctions are required; the visual patterns are open.
6. **Operator report destination.** Story 52 requires clear failure/coverage reporting. Logs, a report artifact, or another delivery mechanism are not selected. It must not silently expand into the excluded commissioner CMS.
7. **Real-data home selection.** Which qualifying records occupy the accepted featured and Recently added positions, and what replaces an unavailable or tied sample result. Accepted geometry is not an award-selection policy.

Sources: `PRODUCT.md:31-34,45,62,68,80`; `SPEC.md:4,19-74,93-98`; `DESIGN.md:138,222,254`; surface brief `:26,59-61`.

## Calculation decisions that cannot be assumed settled

| Topic | Already specified | Still unspecified or expressly provisional |
| --- | --- | --- |
| Season dominance | Team points per played regular-season game compared with the season's league-wide points per team-game. Actual scores remain official records. Sample evidence demonstrates `(team PPG / league PPG - 1) * 100`. | General display rounding/precision and treatment of incomplete eligible coverage are not specified. |
| Uncrowned Kings | Rank documented dominance among completed nonchampionship seasons. | Whether to impose any extra minimum sample beyond completion, and how tied qualified seasons appear in the full archive. Ties cannot be broken by inventing a winner. |
| Expected wins | Proposed rule: fraction of other teams outscored in the same completed week, half credit for ties, summed over eligible weeks. Retrospective, not predictive. | The word proposed remains in `SPEC.md:89`. Eligible-week handling beyond completed weeks, final presentation, and any related minimum sample need an explicit contract. |
| Schedule Victims | Identify strong scoring with disappointing results; compare actual results with weekly all-play results and link to exact weekly scores. | Ranking formula and qualification thresholds are not supplied. The spec does not select actual-minus-expected wins as the final ranking. |
| Public Enemy No. 1 | Use selected head-to-head scope; show underlying record and sample size; document opponent-ranking rule. | Opponent-ranking formula and eligibility/minimum games are explicitly unresolved. |
| Rate and award eligibility | Display samples, explain eligibility and any minimum-sample rules, keep calculations consistent across all views. | No numeric minimums are chosen. The spec does not require an arbitrary universal cutoff. Choose a rule per affected metric, including an explicit no-minimum rule where intended. |
| Streaks, close games, blowouts | These records are required; regular/playoff/consolation/placement scope rules apply. | Definitions of close/blowout, streak continuity across seasons and scopes, tie interruption, and relevant qualification rules are not written. |
| Player contributions | Count starting-lineup points for selected manager or franchise. Bench performances stay separate. | Full presentation and eligibility for partially available lineups/player points remain unspecified. |
| Bench Crimes | Highest benched single-game points is demonstrated. An avoidable-substitution claim requires proof of a legal historical substitution. | No broader substitution-ranking or lost-win formula is agreed. Do not infer one from the playful name. |
| Draft and trade interpretation | Preserve recorded picks, keepers, completed moves, and assets. | A draft-value or trade-winner formula is outside the required work and must not be invented. |

Sources: `SPEC.md:19-20,31-39,85-92,98,110-113,116,126`; `PRODUCT.md:54-58,62,68`; `src/lib/records.ts:12-44`.

## Platform states required by the existing behavior

| State or distinction | Requirement evidence | Prototype coverage |
| --- | --- | --- |
| Public access and direct shared entry | Stories 1, 4; `SPEC.md:96,116` | Sample query entry, no login. |
| Default regular; playoffs; combined; explicit consolation/placement | Stories 16-18; `SPEC.md:86,108` | Table sample filters and URL scope. |
| Tied record holders and sample sizes | Stories 15, 20, 39; `SPEC.md:98,116` | Evidence says no ties; no tied-holder fixture. |
| Completed versus ongoing season | Stories 7, 35, 46; `SPEC.md:88,94,109` | Synthetic completed season only. |
| Genuine zero versus missing history, unplayed result, incomplete response, or empty activity | Stories 43, 46-47; `SPEC.md:95,113,115` | Not-imported sample notice; empty sample-scope treatment only. |
| Last successful import, coverage gaps, failure while keeping prior data | Stories 48-52; `SPEC.md:94-95,115` | No importer or persistence. |
| Available versus unavailable names, images, lineups, player points, keeper/eligibility data | Stories 12, 27, 37, 40; `SPEC.md:85,91-92` | Current-image identity limitation, accessible initials, unknown substitution eligibility. |
| Ownership replacement and former manager | Stories 8-11; `SPEC.md:83-84,107` | No real identity views. |
| Invalid record link and empty selection | Public share behavior; existing prototype | Record not found plus back link; empty sample scope. Full-platform recovery presentation is open. |
| Keyboard focus, reduced motion, long names, unusual image dimensions, failed clipboard | Accepted prototype; `DESIGN.md:188-194,216-236` | Existing implementation and browser tests, plus stored visual verification. |

Generic loading, skeleton, and editable-form error systems are not established. The chosen rendering/data architecture will determine whether visitor loading states are needed. The manual copy-link field is not an approved general form/error pattern. Source: `DESIGN.md:222`.

## Local implementation and runtime evidence

- Routes are only `src/pages/index.astro` and `src/pages/sample-history.json.ts`. Astro output is static, with no deployment adapter. Source: `astro.config.mjs:3-6`.
- `index.astro` directly imports `assets/data/sample-history.ts`. It renders two regular-season records and one initially hidden playoff table row. All claims are sample claims. Fixture status is `not-connected`, and the last-success timestamp is null. Sources: `src/pages/index.astro:2-7,73-82,108`; fixture `:1-5,23-80`.
- The header links are `#featured-records`, `#record-book`, and `#recently-added`; brand returns `/`. They are same-page navigation, not a platform route design. Source: `src/pages/index.astro:19-25`.
- Examples of current share syntax are `/?record=uncrowned-2024#evidence`, `/?record=bench-2023-week-7#evidence`, and `/?scope=combined&record=uncrowned-2024#evidence`. The sample IDs are not historical entity routes. Ordinary evidence clicks preserve current scope in the URL; selecting regular removes the scope query. Source: `src/scripts/home.ts:48-65`.
- Evidence retains the team image, record identity, result, method, eligibility/sample facts, sample-data link, and source JSON. Bench evidence names Sample receiver without identifying the team portrait as that athlete. Sources: `src/pages/index.astro:85-106`; `src/lib/records.ts:23-44`.
- Evidence entry focuses its heading and scrolls to the section. Reduced motion makes that scrolling immediate. Close and header navigation remove the record query and keep scope. Browser back/forward and hash changes resynchronize from the URL. Unknown IDs show a recovery article and hide Copy link. Sources: `src/scripts/home.ts:15-45,68-80,112-114`.
- Copy link shows successful feedback or a focused readonly manual-copy field after failure. Missing images become accessible initials blocks. Sources: `src/scripts/home.ts:83-109`.
- Sample JSON is a public static response at `/sample-history.json`. With JavaScript unavailable, the page points to this fixture instead of providing the inline evidence interaction. Sources: `src/pages/sample-history.json.ts`; `src/pages/index.astro:109`.
- Runtime metadata records dev URL `http://127.0.0.1:4321/` and preview URL `http://127.0.0.1:4322/`. The recorded PIDs are 20936 and 16648. Fresh local inspection found neither PID and no listening socket on either port. Those files are historical runtime metadata, not evidence of a currently running preview. No HTTP request was made. Sources: `.astro/dev.json`, `.astro/preview.json`; local process/listener inspection.
- Node is `v24.14.0`; npm is `11.9.0`. `package.json` has Astro `7.4.2`, TypeScript `^6.0.3`, Astro check `^0.9.12`, Playwright `^1.64.1`, and Node types `^24.19.2`. There are local `node_modules`, `dist`, and a lockfile. Commands are `npm run dev`, `check`, `build`, `preview`, and `npm test`. Sources: `package.json`; `README.md:5-26`.
- The six authored browser tests cover sample scopes, keyboard evidence/player identity, share/history/not-found, copy success/failure, missing images, and viewport containment from 320px to 1600px. Existing `test-results/.last-run.json` says passed. The stored visual verification says no errors or overflow at five viewports and lists evidence, empty/error, focus, long-name, unusual-image, and missing-image checks. These are existing records, not fresh reruns. Sources: `tests/home.spec.ts`; `.impeccable/review/verification.json`; `test-results/.last-run.json`.
- The inherited Impeccable blocker concerns a stale original-logo exception receipt. It does not supersede Sam's accepted prototype or authorize replacement of the original logo. Sources: surface brief `:59-61`; `.impeccable/review/refinement-review.md:7-9,37`; `.impeccable/review/gate-blocker.md:3-11`.

## Repository, tickets, and implement-spec handoff

- Fresh `git status --short --branch`, `git remote -v`, and `git log -5 --oneline` all fail with not a Git repository. The workspace has `.gitignore` but no `.git` entry. There is no local branch, commit history, remote, worktree, or PR context to inspect.
- No local ticket files, issue graph, `.github` setup, database schema/migrations, environment configuration, deployment configuration, or project-level license was found in the project inventory. No external tracker was queried, so external repository/ticket existence remains unknown.
- `SPEC.md:136` explicitly calls itself a local publication draft with no configured project issue tracker or repository remote. It directs setup of issue destination/triage vocabulary, then publication as one issue labeled `ready-for-agent`. That statement agrees with the current local Git inspection.
- The statements in `SPEC.md:80,104,135` about an empty workspace/unselected stack/no tests describe the earlier spec state. Current Astro code, TypeScript setup, browser tests, accepted home, and `PRODUCT.md:11,80` supersede those historical setup facts. Core product and calculation requirements remain authoritative.
- The requested `C:/Users/sfarl/.codex/skills/implement-spec/SKILL.md` requires tickets with blocking relationships, a ready frontier, and one PR branch implementing the whole spec. It describes implementer worktrees, merging, final code review, and cleanup. No tickets currently provide that graph. A set of screen names alone would not satisfy that handoff.
- The skill's step 3 says draft PR, but Sam's supplied GitHub instruction requires a real ready-for-review PR when asked to open one. That user instruction takes precedence. No PR action is authorized by this research assignment.
- For later ticket preparation, story coverage, decided route/screen/state contracts, resolved calculation rules, application-boundary acceptance scenarios, and declared blocking edges still need to be available as pointers. This inventory does not choose the tickets or their dependencies.
- Sam also requires native GitHub parent-child and blocking relationships for related issues. Text-only ordering is insufficient when GitHub is the selected destination. No issue relationship was created here.

Local preparation skills were checked by path and frontmatter metadata only, without reading or invoking their workflow bodies:

| Skill path | Declared purpose |
| --- | --- |
| `C:/Users/sfarl/.agents/skills/setup-matt-pocock-skills/SKILL.md` | Configure issue tracker, triage labels, and domain docs before the engineering skills. |
| `C:/Users/sfarl/.agents/skills/to-spec/SKILL.md` | Synthesize the current conversation into a spec and publish it to the configured tracker. |
| `C:/Users/sfarl/.agents/skills/to-tickets/SKILL.md` | Break a plan/spec/conversation into tracer-bullet tickets with declared blocking edges, using native links for a real tracker. |
| `C:/Users/sfarl/.agents/skills/implement-spec/SKILL.md` | Implement the result of to-spec and to-tickets. This is a second path, distinct from the requested `.codex` copy read in full. |

Nothing in this inventory approves a design, metric policy, hosting/database choice, repository destination, issue publication, ticket graph, or implementation start.
