# Platform design brief

Status: APPROVED DESIGN HANDOFF. Sam confirmed the written scope and design at Q44 on November 3, 2026 with "Yes it does." The design walkthrough is complete. Implementation follows the separate implement-spec workflow.

## Job and audience

Farls da bag members arrive to discover a memorable achievement, settle a league argument, or revisit a person, season or game. Former managers retain their history. Visitors can browse and share without an account.

The platform is a public, read-only museum for one configured Sleeper league. Specialized league history leads. Standings, lineups and brackets provide context. It does not recreate the fantasy app's draft board, transaction feed or general NFL player pages.

Home is an Experience view. Collections, rankings, profiles, seasons and historical details use the precision and restraint of Operate and Read views.

## Handoff and authority

- [SPEC.md](SPEC.md) defines current release requirements and application-boundary acceptance scenarios.
- This brief defines page structure, navigation, responsive behavior and selected visual references.
- [DESIGN.md](DESIGN.md) records the established History on Demand visual system. Its old evidence components describe the existing prototype and are superseded for the full platform.
- [.impeccable/platform-chrome.md](.impeccable/platform-chrome.md) controls the shared header and title colors.
- [docs/metrics.md](docs/metrics.md) defines calculation, scope, ranking and attribution rules for implementers.
- [docs/requirements.md](docs/requirements.md) accounts for every original story and the additions made during the walkthrough.
- [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md) contains local tickets with explicit blocking relationships.
- [.impeccable/platform-design-decisions.md](.impeccable/platform-design-decisions.md) preserves the interview decisions. The latest confirmed user decision wins over older prose or mockup details.

Astro and TypeScript are confirmed. The existing home uses synthetic data. The importer, remaining routes and automatic refresh have not been implemented. Hosting, persistence, refresh scheduling and the project license remain implementation/setup choices.

## Visual direction

Carry forward History on Demand. Compose for a broad web browser first. Use complete original team images, dark condensed headings, violet actions, aqua and lilac record fields, white space and quiet table rules.

Use the same shared header on every route. Desktop has the league brand, then Records, Managers, Seasons, Rivalries. The brand returns Home. The current section has violet text and an underline. Phone uses the approved brand-and-Menu pattern. Equivalent title and identity areas use the same dark ink, type roles and spacing.

Original source artwork wins over a generated likeness. Show all of an image inside a padded rounded white frame. Use the same rounded frame for initials when artwork is absent or fails. Directory avatars use one compact size, approximately 44px, and consistent rows. Do not enlarge a logo to fill a record field or apply the Home canvas scale to every archive table.

Cut taglines, redundant labels, oversized context blocks, decorative badges and appended summaries. Important context belongs beside the result it qualifies. Home can be expressive; history views stay compact and readable.

Public pages omit calculation panels, source JSON, methodology dumps, operational status, freshness indicators and update dates. A historical date or a season format is content, not an update indicator. Rates retain their sample size, and missing values must not masquerade as zeros. Synthetic previews retain a plain Sample stats disclosure; the finished real-data archive does not use that disclosure as a status pattern.

## Selected references

Paths below are relative to the project root. These are composition references, not source data or working routes.

| Family | Selected reference and scope |
| --- | --- |
| Home desktop | [.impeccable/prototypes/platform-round-two/.impeccable/mocks/expanded-home.png](.impeccable/prototypes/platform-round-two/.impeccable/mocks/expanded-home.png), Q34. Two features, four compact categories, then recent records. |
| Home phone opening | [.impeccable/review/mobile.png](.impeccable/review/mobile.png), the accepted feature-card arrangement only. Replace its old evidence action with View rankings. |
| Home phone index | [.impeccable/prototypes/platform-round-two/.impeccable/mocks/expanded-home-phone-records.png](.impeccable/prototypes/platform-round-two/.impeccable/mocks/expanded-home-phone-records.png), confirmed through Q43. |
| Records collection | [.impeccable/prototypes/collections/.impeccable/mocks/records-collection.png](.impeccable/prototypes/collections/.impeccable/mocks/records-collection.png), Q40. |
| Category ranking | [.impeccable/prototypes/record-navigation/.impeccable/mocks/b-record-page.png](.impeccable/prototypes/record-navigation/.impeccable/mocks/b-record-page.png), selected B. Final behavior is ten places plus cutoff ties, even if the image has fewer rows. |
| Profile desktop | [.impeccable/prototypes/manager-profile/.impeccable/mocks/b-timeline-strip.png](.impeccable/prototypes/manager-profile/.impeccable/mocks/b-timeline-strip.png), Q33 B. |
| Profile phone | [.impeccable/prototypes/manager-profile/.impeccable/mocks/b-timeline-strip-mobile.png](.impeccable/prototypes/manager-profile/.impeccable/mocks/b-timeline-strip-mobile.png), Q33 B. Shared title colors override incidental raster variation. |
| Manager directory | [.impeccable/prototypes/collections/.impeccable/mocks/manager-directory.png](.impeccable/prototypes/collections/.impeccable/mocks/manager-directory.png), Q41. Uniform avatar frames and row rhythm are required. |
| Season overview | [.impeccable/prototypes/platform-round-two/.impeccable/mocks/season-overview-refined.png](.impeccable/prototypes/platform-round-two/.impeccable/mocks/season-overview-refined.png), revised Q35 working foundation. The earlier season-overview.png is rejected. |
| Season phone | [.impeccable/prototypes/platform-round-two/.impeccable/mocks/season-overview-refined-phone.png](.impeccable/prototypes/platform-round-two/.impeccable/mocks/season-overview-refined-phone.png), working foundation with further polish deferred. |
| Rivalry | [.impeccable/prototypes/history-details/.impeccable/mocks/rivalry.png](.impeccable/prototypes/history-details/.impeccable/mocks/rivalry.png), Q37. |
| Matchup | [.impeccable/prototypes/history-details/.impeccable/mocks/matchup-clean.png](.impeccable/prototypes/history-details/.impeccable/mocks/matchup-clean.png), Q38 with requested callout removal. |
| Scoped player history | [.impeccable/prototypes/history-details/.impeccable/mocks/player-contributions.png](.impeccable/prototypes/history-details/.impeccable/mocks/player-contributions.png), Q39. |
| Playoffs | [.impeccable/prototypes/collections/.impeccable/mocks/playoff-bracket.png](.impeccable/prototypes/collections/.impeccable/mocks/playoff-bracket.png), Q42. |

Generated statistics, names, timelines and results are illustrative. They do not establish facts about the real league. Shared components, fonts and color roles control implementation. Individual generated letterforms or color shifts are not new design tokens.

Q43 authorizes reusing the approved mobile header, vertical timeline and stacked rows for the remaining views. It also resolves Q36. Separate phone mockups are no longer required for every family. Responsive usability and the checks below still apply.

## Navigation and URL behavior

Use stable identity keys rather than display names in routes. Provider IDs remain strings. The route map is a build contract; filenames and internal module boundaries remain implementation choices.

| Route | Primary job | Header section |
| --- | --- | --- |
| / | Discover records | None selected |
| /records/ | Find a category | Records |
| /records/[category]/ | Compare ranked results | Records |
| /managers/ | Find current or former people | Managers |
| /managers/[person]/ | Explore one person's career | Managers |
| /managers/[person]/seasons/[year]/ | Explore that person's season | Managers |
| /franchises/ | Find a franchise history | Managers |
| /franchises/[franchise]/ | Explore continuity across owners | Managers |
| /franchises/[franchise]/seasons/[year]/ | Explore one franchise season | Managers |
| /seasons/ | Find a season or championship result | Seasons |
| /seasons/[year]/ | Browse standings, games, playoffs and contributions | Seasons |
| /seasons/[year]/matchups/[contest]/ | Revisit a game or multiweek contest | Seasons |
| /rivalries/ | Compare two selected people | Rivalries |
| /managers/[person]/players/[player]/ | Inspect contributions to a person | Managers |
| /franchises/[franchise]/players/[player]/ | Inspect contributions across franchise owners | Managers |

Tabs and filters belong in the page URL. Use tab, season, scope, week, sort and limit only where they apply; rivalries use a and b for the pair. Contextual move views can also retain view and event. The builder can choose exact parameter spelling once and document it. Regular season is the default game scope. Category defaults are defined in docs/metrics.md, not imposed by a global Home filter.

Main navigation opens section defaults. Related links carry the relevant season, identity and eligible game scope. Opening a new season retains the selected local tab if available. Browser Back restores the earlier filters, sorting and expanded result count. Reloading or sharing the URL reproduces the view.

Use real links for navigation and native form controls for filters. Sorting changes the visible order, not the canonical rank assigned by the category. Show more retains the current selection and exposes the next results without splitting ties.

## Page contracts

### Home

Lead with all-time history. The prominent records are Best season without a title and Highest-scoring benched player. Each includes its category, holder, player where applicable, value, unit, relevant year/week and complete team image. View rankings opens that category's ranked page.

Follow with four compact entries: Unluckiest season, Most productive pickup, Dropped players who delivered elsewhere, Longest winning streak. Pickup/drop entries identify both the manager and player. No repeated thumbnails are needed in the index.

Recent records follow the all-time section. Show a short list of the newest historical events currently holding a top-ten place in a category. Use the event date, never the import date. Recent entries also open the category with the relevant result retained as context. Do not add a feed of every transaction or generic weekly recap.

On phones, stack the two features using the retained opening pattern, then the four divided compact entries and recent rows. Keep images complete and result units/dates attached. The page must not inherit the existing prototype's public evidence reveal.

### Records collection and category ranking

The collection uses four named groups, Careers, Seasons, Matchups, Players. Each row has the category link, leading holder and value. Use a broad two-column index on desktop and one column on phones. Category-specific filters belong on the ranked page. Do not attach a regular-season label to championship totals.

The ranked page leads with the plain category name and its leading result. Follow with page-local applicable season/scope controls and a full-width ranking table. Rows carry place, identity, result, sample size for rates, and year/week where needed. A player measure includes both player and manager/franchise attribution.

Show ten places initially and include every entry tied at the cutoff. Show more exposes further results. Game and season categories rank performances, allowing repeated managers. Career categories have one aggregate row per person. Shared leaders remain visibly tied.

The row's primary history link opens its matchup, selected manager-season, career or scoped player history, as defined in docs/metrics.md. Linked secondary identities remain available without making the whole row an ambiguous nested link.

On phones, each result becomes a divided stacked entry with rank/category context, identity and a value/date line. Preserve table headers or equivalent accessible labels. Values remain aligned and names wrap.

### Manager and franchise directories

Managers is a compact full-width table grouped into Current managers and Former managers. These are historical membership groups, not operational statuses. Columns are manager, seasons, W-L-T record and titles. Omit the tie segment only when zero. Names open the person's profile. Use one compact avatar/initials frame size. Sort within groups without losing their headings.

A Franchise histories link opens /franchises/. Reuse the directory family with franchise name, current or latest known manager, season range, record and titles. It leads to the full franchise profile. Do not merge people who successively owned a roster.

Default to an alphabetical identity order within groups. Column sorting is shareable. On phones use the approved two-line row pattern, keeping identity first and record/titles together. A source gap does not become a Former manager assignment.

### Manager and franchise profiles

Use selected B. Put identity, compact career facts and the takeover/team-name timeline above Seasons, Rivalries and Players tabs. Seasons opens initially. Show W-L-T, win percentage with games, official points, championships and playoff appearances. Keep these as a compact facts strip rather than a dashboard of cards.

The manager timeline covers only that person's tenure. Include the acquisition year/date and predecessor when supported, linked franchise history, and confirmed team-name changes. When a manager has more than one tenure, show the actual separate spans. Do not invent names or exact dates from present-day account metadata.

The franchise variant uses the same family and full ownership timeline. Career facts aggregate the franchise's history, with results attributed to the owner who earned them. Switching to a manager profile changes scope explicitly.

Seasons is a full-width archive, newest first. Rows include year, historical team name, record, points, finish and championship/playoff result when resolved. Franchise rows also name the owner. The year opens the relevant person-season or franchise-season route.

Rivalries lists opponents with W-L-T, meetings, average margin and the current streak in the chosen scope. Put the nemesis result here using the agreed losses-minus-wins rule. Preserve tied nemeses and omit the label when nobody qualifies. An opponent link opens the selected pair in Rivalries.

In the franchise variant, group head-to-head rows by owning person and season, retaining those two fields beside the opponent. Each link opens two actual people with that season selected. Do not merge successive owners into a fictional person or send an aggregate franchise result to a person-only comparison. Nemesis remains a person-level result.

Players shows scoped starting-point contributors, starts and season range. Allow a season filter and contextual views for productive pickups and dropped players' later contributions. Rank these views by their actual contribution measure; do not show a full transaction log or trade grade. A player opens the scoped contribution detail, while a move result retains its ownership-spell context.

On phones, use the approved vertical timeline and stacked season/opponent/player rows. Compact facts wrap in reading order. Tabs scroll locally if needed and retain visible focus.

### Person-season and franchise-season variants

Reuse profile context at season scope. Show year, historical team identity, owner, official record/points and resolved finish. Keep a link to the whole league season.

Default to Matchups, with Players as the other local view. Matchups lists the identity's eligible games by week, score, opponent and result. Provide game scope and sort controls. Players contains that season's starting contributors and ranked pickup/drop context. Links open matchups, the selected rivalry pair or scoped player contributions with the season retained.

Show the relevant timeline events without repeating the full career summary. On phones reuse stacked rows and vertical identity history. These are routine variants, not a new visual family.

A drop-category entry opens the dropping person's season Players view with Drops and the event selected. Show that event's later receiving-person contributions and game links as actual history. The dropping person's own contribution totals do not include those points. This uses the contextual Players family rather than an unscoped NFL player page.

### Seasons index and overview

The index is also the championship history. List years newest first with champion, runner-up and enough format context to distinguish seasons. Unresolved results use an em dash. A year opens Standings. Champion and runner-up link to their manager-season history. Do not add an ongoing-season badge or update timestamp.

The selected season overview has compact year selection, champion/runner-up when resolved, and a closed Season format disclosure. Format contains supported roster/scoring/playoff settings needed to understand that season. Use the source rules, not modern defaults.

Local tabs are Standings, Matchups, Playoffs, Players. Standings opens first. Its table shows manager/historical team, record, points, scoring relative to the league and wins versus expected. Sort by official standing initially; other column sorts are shareable. Team/manager links open that season's profile. Comparison values link to the relevant category or scoped history without opening calculations.

Matchups provides a week selector and compact paired results with game type clearly identified. Default to the latest completed week. Link each result to its matchup and each identity to its season profile. Do not present an unplayed scheduled game as a 0-0 final.

Players shows season-scoped contributors, productive pickups and significant drops, with manager attribution. This is specialized contribution analysis, not a generic NFL stat leaderboard or all-moves feed.

On phones, compact context precedes locally scrollable tabs, then stacked rows. Preserve the revised season foundation. Detailed mobile polish occurs during implementation; do not restore the rejected large middle blocks or bottom statistic strip.

### Playoffs

Reuse season context and select Playoffs. One selector chooses Championship playoffs, Consolation or Placement when available. The championship bracket opens initially.

Show rounds, seeds when available, participant names, official scores and restrained winner emphasis. Connect bracket progression on desktop. Round/week headings link to the matchup. No extra trophy panel or repeated champion summary follows the bracket.

A bye is an advancement, not a played victory. An unresolved future contest has unassigned participants/scores rather than fabricated results. Multiweek contests show their legs and official aggregate in the matchup detail; bracket progression and career wins count the contest once.

On phones, use rounds in reading order with compact contest rows and the advancing result clear. If a bracket needs local horizontal scrolling, contain it within its own labeled region; the page itself must not overflow.

### Rivalries

Two manager selectors define the pair. All seasons and Regular season are the defaults. Until two distinct people are selected, show the selectors and an empty history area rather than silently comparing a person with themselves.

After selection show a compact summary of W-L-T, meetings, average margin and current streak, followed by the game table. Show the ten newest meetings initially and offer Show all when more exist. Scope/year filters and pair selection live in the URL. The primary date/week link opens the matchup.

If two valid people never met, show zero meetings and no invented margin or streak. On phones, stack selectors and the few summary facts, then use paired-score rows with week/year links. Do not turn the summary into large metric cards.

### Historical matchup

Use the cleaned Q38 arrangement. Show season/week or contest rounds, both complete team identities, official score and result. Link back to the league season and to each relevant person-season profile.

On desktop align both teams' Starters and Bench tables side by side. Include historical slot/position, player and available recorded player points. Preserve official team totals even when player sums differ. Unknown points use an em dash.

A link from a record can select the relevant player row. Keep a quiet lilac highlight. There is no separate record-description callout beside Bench, badge, explanatory calculation panel or claim that an unused substitution would have won.

On phones keep the compact score comparison at the top, then stack each team's lineup sections with explicit team headings. A selected player is reachable through a fragment and receives visible context without moving keyboard focus unexpectedly. Player links open contributions for that team's person or franchise scope.

### Scoped player contribution history

The heading is the player with linked manager or franchise context. No NFL biography or player portrait is required. Show starting-lineup points and starts for that scope, followed by season totals and contributing games. The Games section has a local season selector.

Rows contain week, opponent, player points and official team result. Week links open matchups; opponents link to their manager profiles. Only actual starts enter contribution totals. A benched record can lead here without adding that bench performance to the starting totals.

A Franchise contributions link changes to the corresponding full-franchise scope explicitly. Phone uses stacked season/game rows. If the player had no starts in that scope, show genuine zero starts/points and an empty contributing-games table; missing point inputs remain unknown rather than zero.

A pickup-category link retains its selected acquisition spell and year. Under Sam’s November 3, 2026 policy revision, the measure includes only full weeks after acquisition and before departure, or through season end; drop measures likewise exclude the drop week. The visible acquisition context, totals and game list then use that spell, with a link back to the player's whole selected-manager history. Do not show full-career totals as if they were earned after one pickup.

## Shared states and accessibility

These state rules apply to every route rather than adding a new page design for each case.

| State | Required behavior |
| --- | --- |
| Valid selection with no qualifying results | Keep heading/controls and a concise No results for this selection message. No fabricated zero-score record. |
| Known identity with no games | Preserve identity/history, show zero games and undefined rates as an em dash. |
| Missing field | Use an em dash or omit the unsupported historical fact. Preserve a real numeric zero. |
| Missing required source data | Do not replace the last successful published result with an incomplete calculation. Report the gap internally. Initial publication remains blocked until required coverage or an explicit scope decision is resolved. |
| Invalid entity/category/year | Render a real not-found page with shared navigation and a relevant collection link. |
| Invalid query value | Normalize once to a documented valid default. Never silently substitute a different identity. |
| Source outage during refresh | Keep the last successful history readable. No public outage, freshness or update panel. |
| Missing image or long name | Same rounded initials frame; text wraps without changing the row's meaning. |
| Loading | Keep previous content or use a small local pending affordance if client navigation needs one. No page-wide skeleton for a static archive. |
| Shared rank | Show the shared rank and all cutoff ties. No invented tiebreaker. |

Use landmarks, heading order, semantic tables or equivalent row labels, native controls, a skip link and visible keyboard focus. Menus expose expanded state, close with Escape and return focus. Tabs identify the selected view and retain normal link behavior. Do not rely on color alone for selection, winners or ties.

Meet WCAG 2.2 AA contrast for ordinary text and controls. Preserve usable text at 200% zoom, minimum 44px interactive targets where practical, and reduced-motion behavior. Avoid layout movement from image loading. Test meaningful narrow widths from 320px through desktop, including long names, missing images, ties and empty selections. No page-wide horizontal overflow.

## Delivery boundary and remaining choices

The approved design now guides the implemented full platform. Standalone Node delivery, durable atomic JSON history, daily locked systemd refresh and MIT are recorded in [ADR 0001](docs/adr/0001-local-node-delivery.md). Feature issues #2–#18 are closed; final verification, independent reviews and release handling remain open under #19 and parent #1. [docs/verification.md](docs/verification.md) records the actual checks.

The repository and task graph are configured at [samfarls55/fantasy_football_history](https://github.com/samfarls55/fantasy_football_history). No external host, domain, scheduled service or timer has been provisioned. Deployment-specific service checks require an available chosen host; local publication and production-server checks do not establish deployment.

Source coverage is documented in docs/coverage.md and validated at refresh. Sam explicitly revised both move measures on November 3, 2026 to later weeks only, excluding move weeks; exact kickoff timing remains unsupported and is not needed for that window. Missing required inputs retain the last complete publication and produce operator diagnostics.

The inherited root Impeccable receipt problem remains documented in [.impeccable/review/gate-blocker.md](.impeccable/review/gate-blocker.md). Design approval does not repair or close those old prototype phases. Use supported checks and record an accurate disposition during the actual implementation.
