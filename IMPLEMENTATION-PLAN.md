# Full-platform implementation plan

Status: Confirmed local task graph for the implement-spec workflow. Sam approved the written handoff at Q44 on November 3, 2026. T00's repository/workflow setup is complete; delivery choices remain open. The remaining tickets are unstarted. Spec/ticket publication and implementation invocation remain next steps.

## Start here

Read [SPEC.md](SPEC.md), [DESIGN-BRIEF.md](DESIGN-BRIEF.md), [docs/metrics.md](docs/metrics.md) and [docs/requirements.md](docs/requirements.md). The design brief links every selected image and defines routine route variants. Keep the original artwork and the established visual system.

The public repository and GitHub Issues are configured at samfarls55/fantasy_football_history. AGENTS.md and docs/agents/ record the shared workflow, and all five triage labels exist. The app is an Astro/TypeScript synthetic Home prototype. No importer, durable history store, automatic refresh or complete platform exists. Pre-work verification passed Astro check, the production build and all six browser tests.

These are local tickets with explicit blocking edges, not published issues. When publication is invoked, publish the spec as the parent and T00–T12 as children, with the native blocking relationships below. Record T00's completed repository/workflow portion and its remaining delivery choices. Do not claim text mentions are native GitHub relationships.

The implement-spec skill aims for one branch and one PR implementing the whole spec. Sam's GitHub instruction overrides its draft-PR step: create a real ready-for-review PR after the implementation is reviewable and required checks pass. Do not create an empty or draft PR during this design handoff.

## Task graph

A ticket becomes ready only when every listed blocker is complete. The final handoff-confirmation prerequisite was satisfied at Q44. When implementation is invoked, T00 establishes the repository workflow before T01 saves audit notes/fixtures or any implementation ticket changes application files.

| ID | Deliverable | Blocked by | Primary acceptance |
| --- | --- | --- | --- |
| T00 | Repository, workflow and delivery choices | None | A13 |
| T01 | Bounded coverage audit and deterministic source fixtures | T00 | A02, A07, A08, A11 |
| T02 | First import-to-season slice and shared shell | T00, T01 | A01, A02, A11, A12, A13 |
| T03 | People, franchises, directories and timelines | T02 | A03, A04 |
| T04 | Official games, competition scopes and playoff history | T03 | A04, A05, A14 |
| T05 | Category rankings and career/game records | T04 | A01, A05, A09 |
| T06 | Dominance and schedule comparisons | T05 | A06, A09 |
| T07 | Scoped player contributions and bench record | T04, T01 | A07, A09, A14 |
| T08 | Significant pickups and drops | T07, T01 | A08, A09 |
| T09 | Rivalries and nemesis | T04, T05 | A10 |
| T10 | Full Home discovery and recent records | T05, T06, T08 | A09, A14 |
| T11 | Automatic refresh, corrections and operator workflow | T02, T09, T10 | A02, A11, A13 |
| T12 | Complete-platform verification and handoff | T03, T04, T05, T06, T07, T08, T09, T10, T11 | A01–A14 |

The ready frontier after T04 is T05 and T07. After T05, T06 and T09 can proceed while the contribution branch continues. T10 joins the ranking/comparison/move work; T11 joins refresh with the derived views it must update.

## T00 Repository, workflow and delivery choices

State: partially complete. Repository, remote, issue destination, shared configuration and triage labels are set up. Persistence, hosting/refresh execution and license choices remain open.
Blocked by: none.
Stories: 53, 54.

Use the configured samfarls55/fantasy_football_history repository and GitHub Issues. Follow docs/agents/issue-tracker.md and docs/agents/triage-labels.md. Publish the spec/task graph only when that workflow is invoked.

Record the implementation choices for durable storage, hosting/refresh execution and license. Astro/TypeScript and the product rules are already fixed. Select the simplest setup supporting atomic retained history and automatic completed-week refresh; do not introduce hosted multi-league management.

Done when the workspace can support the skill's branch/worktree/PR workflow, the issue graph can be published with real relationships if required, and the persistence/refresh choices needed by T02 are recorded. No paid service or deployment is implied by this planning document.

## T01 Bounded coverage audit and fixtures

State: unstarted.
Blocked by: T00.
Stories: 5, 12, 27, 40–43, 46, 47, 52, 54–56.
Pointers: .impeccable/player-impact-feasibility.md; docs/metrics.md, Coverage and publication.

Inspect actual reachable seasons and the data needed for completed games, historical lineups/player points, official scores, brackets, draft inputs and completed acquisition/drop events. Use a bounded, cached audit rather than repeated broad live requests. Record coverage and exact unknowns. Do not treat one sampled 2019 response as an audited contract.

Establish source-supported same-week event/start ordering and ownership-spell boundaries. If the provider cannot establish a required attribution, return the concrete affected scope to Sam before changing the claim. Audit completion may document an unresolved product blocker; T07/T08 cannot ship an unsupported ranking merely because the audit ran.

Save small synthetic fixtures shaped like validated source responses. Include the known replacements, different scoring/playoff formats, ties, overrides, byes, multiweek contests, incomplete/current seasons, null keeper fields, completed/failed moves and repeated ownership spells.

Done when core history inputs are established, fixtures can drive the real import boundary, and each point/move-based claim has a clear supported or blocked disposition. Keep diagnostics internal.

## T02 First import-to-season slice and shared shell

State: unstarted.
Blocked by: T00, T01.
Stories: 1, 2, 5, 6, 25, 31, 46, 47, 49–51, 53, 54, 59.

Implement one configured-league import entry point through persisted history to /seasons/ and season Standings. Follow previous-season references, preserve string IDs/settings and distinguish missing values from real zeros. Publish a complete snapshot atomically and retain the last good snapshot on failed input.

Build the shared desktop/phone header, title roles, source-image frame/fallback, native filters, local tabs and accessible table/stacked-row pattern as needed by this working slice. Reuse them in later tickets. Do not build a general component framework.

Done when a deterministic fixture import yields the expected years and standings in public read views with no login, repeated import does not duplicate totals, source failure keeps the previous view, and the first responsive slice works by keyboard. Completion includes the real boundary test, not only mocked components.

## T03 People, franchises, directories and timelines

State: unstarted.
Blocked by: T02.
Stories: 8–13, 23, 54, 57.

Resolve people/accounts separately from season rosters and franchise continuity. Add manager/franchise directories, profiles, season variants and timeline links using profile B. Confirmed replacements keep separate careers. Include supported takeover/predecessor/rename events, correct tenure boundaries and owner attribution.

Show the full required facts inventory, including career points and playoff appearances. Resolve the contest scopes and championship outcomes needed for these profile facts from the imported source format/brackets as part of this slice. T04 reuses those same rules for game and bracket views. Mockup omissions do not remove requirements. Directory avatar frames and rows have uniform compact sizing.

Done when fixture replacements/renames are correct in both manager and franchise views, former managers remain available, and shareable profile/tab/season URLs work with the approved phone pattern.

## T04 Official games, competition scopes and playoff history

State: unstarted.
Blocked by: T03.
Stories: 7, 16–18, 21–27, 31, 46, 54.

Add season Matchups/Playoffs, championship history and the cleaned matchup detail. Preserve source settings and official scores/overrides. Expose and verify the shared regular/playoffs/combined/consolation/placement rules and championship outcomes already used by profile facts, rather than creating a separate classification for each screen.

Add both starter/bench tables with available points. Unknown fields remain unknown. Link identities, weeks and contests. A record fragment can highlight a row without a separate callout. Multiweek contests retain their legs and count once for wins/titles.

Done when fixtures prove scopes, byes, unresolved finals, placement and multiweek behavior; the bracket and season links reach the real historical contest; official totals remain correct even when player sums differ.

## T05 Category rankings and career/game records

State: unstarted.
Blocked by: T04.
Stories: 13–21, 31, 38, 39, 54, 58.

Implement the four-group Records collection and selected B category family. Add career totals/rates, scoring highs/lows, career/season streaks and closest-game/blowout categories. Wire applicable season/scope filters, stable result identities, URL sorting and ten places plus all cutoff ties.

A ranked result opens actual history. Keep W-L-T/games beside rates. No public method/source view is required. Category registry must accommodate the agreed season/player categories added by T06–T08 without inventing placeholder facts.

Done when deterministic results, decimals, zero/missing behavior, repeated managers, tied leaders and Show more are correct, and share/Back/filter behavior works.

## T06 Dominance and schedule comparisons

State: unstarted.
Blocked by: T05.
Stories: 7, 25, 32–35, 39, 54.

Implement the exact dominance and expected-win policies, their three completed-season categories, and season comparison columns. Keep actual-minus-expected in the season table and expected-minus-actual in Unluckiest season.

Done when hand-calculated cross-era/length/tie fixtures give the expected results, unfinished seasons never win completed-season awards, and ranking links open the matching manager-season. Do not restore large context cards, bottom statistic strips or public calculation panels.

## T07 Scoped player contributions and bench record

State: unstarted.
Blocked by: T04, T01.
Stories: 21, 27, 36, 37, 41, 44, 54.

Implement manager/franchise Players views, person/franchise-scoped player routes, season totals and linked contributing games. Sum actual recorded starts within the selected scope, keeping bench and team overrides separate. Add the highest-bench category and its highlighted-matchup destination.

Done when contributing games sum to totals, person and franchise scopes differ correctly across replacements, no NFL-wide player profile appears, and a bench record never enters starting totals or asserts a legal missed-win substitution. Required player-point coverage must be supported.

## T08 Significant pickups and drops

State: unstarted.
Blocked by: T07, T01.
Stories: 40–43, 54–56.

Use completed transactions and draft ownership inputs to resolve spells. Add productive-pickup and productive-drop category rankings and contextual Players views. Retain event, dropping/acquiring person, season, receiving-person contributions and game destinations.

Done when the agreed timing/windows, failed events, trades, repeated acquisitions and owner changes are correct through the application boundary. Nullable keeper inputs stay unknown. No public draft-board or all-moves route is introduced. A source gap is a reported blocker, not an invented timestamp or shortened window.

## T09 Rivalries and nemesis

State: unstarted.
Blocked by: T04, T05.
Stories: 28–30, 54.

Implement selected-pair Rivalries and the profile Rivalries tab, with scope/year controls, compact summary and linked game history. The franchise variant groups head-to-head rows by owner and season, so each link can select two actual people and that year without merging owners. Add contextual person-level nemesis with shared ties and the no-nemesis case.

Done when pair reversal, W-L-T, meetings, average margins, current streak, no meetings and nemesis eligibility match fixtures; preselected profile links and shared URLs retain the intended context.

## T10 Full Home discovery and recent records

State: unstarted.
Blocked by: T05, T06, T08.
Stories: 3, 38, 54, 60.

Replace the prototype's public inline evidence behavior with the approved six-category Home and category-first navigation. Keep two prominent features, four compact entries and the subsequent short recent list. Use original complete team artwork in rounded frames.

Recent results are current top-ten historical events ordered by event date. Do not use refresh time or append a generic activity feed. Preserve the approved desktop composition and phone opening/index hierarchy.

Done when every feature opens its real category, values/identity/player attribution are correct, recent records follow the agreed eligibility/date policy, synthetic content cannot be mistaken for real data, and the Home-to-history journey works.

## T11 Automatic refresh, corrections and operator workflow

State: unstarted.
Blocked by: T02, T09, T10.
Stories: 6, 45–54.

Complete the configured automatic refresh mechanism and durable last-successful publication behavior. New completed games and later corrections update standings, records, rivalries, contributors, impact rankings and Home from one consistent history. Repeat runs are safe.

Record run/coverage errors, successful-run timestamps and actionable affected scopes internally. Document initial import, routine scheduling, recovery and configuration. Public pages contain no status/freshness or calculation panels.

Done when a repeat import is unchanged, a later official correction updates all affected observable views without duplicates, failed/incomplete refresh preserves the last good archive, and the selected scheduler can run without weekly manual entry. Verify deployment-specific scheduling when that target is available.

## T12 Complete-platform verification and handoff

State: unstarted.
Blocked by: T03, T04, T05, T06, T07, T08, T09, T10, T11.
Stories: 1–60, subject to the explicit public removals in docs/requirements.md.

Run the application-boundary scenarios A01–A14 and the appropriate Astro check, production build and browser checks. Update or replace prototype-only evidence assertions with the approved flow. Exercise every distinct page family on phone and desktop, including long names, missing images, ties, empty selections, keyboard focus and shared links.

Compare rendered pages with selected references and the shared header contract. Finish detailed mobile polish within the accepted patterns. Do not reopen settled visual choices or replace original artwork to satisfy a generated likeness.

Update domain/setup docs with actual implementation and unresolved deployment limits. Use the supported Impeccable workflow for implementation checks; the inherited prototype receipt blocker does not justify a fabricated pass or manual receipt edit.

Done when all required v1 claims have supported data, acceptance scenarios pass, necessary code review findings are resolved under Sam's standards, and the whole spec is implemented on one reviewable branch. Open a ready-for-review PR only in the authorized repository workflow. Public deployment still requires its own authorized scope. Report any remaining external setup or blocked requirement explicitly rather than calling the entire release complete.
