# Record and contribution rules

Status: Implementation contract derived from the approved walkthrough. Internal documentation only. Do not add a public methodology or source-data screen.

## Identity and source boundary

A person, provider account, franchise, season roster, contest and player are different identities. Resolve a roster within its league season. Careers follow people, franchise totals follow continuity across owners, and every season result retains the person who earned it.

Woody14 to Timh17 at roster 7 in 2020 and alecswartout to sebastian12 at roster 10 in 2021 are confirmed changes between different people. Preserve both careers. Today's display name or avatar is not proof of a past team name. Timeline events use supported names and dates, with year precision when that is all the source establishes.

Keep provider identifiers as strings. Validate untrusted source responses once at the importing boundary, then pass typed data inward. Preserve source values and provenance sufficient to reproduce a result. Do not revalidate internally guaranteed shapes at every call.

The authoritative team score is the official source result, including a commissioner override when present. Retain the source total and override separately. Player points remain their recorded points; do not allocate a team override to players.

## Eligible results and game scopes

Only completed results enter finalized records. A missing response, a scheduled game and a true final zero are distinct. A numeric score alone does not prove completion.

| Scope | Included results |
| --- | --- |
| regular | Completed regular-season games, the default |
| playoffs | Championship-path playoff contests |
| combined | Regular season plus championship-path playoffs |
| consolation | Explicit consolation results only |
| placement | Explicit placement results only |

Do not infer championship-path membership from a week number alone. Preserve the season's actual bracket and format. A bye has no win or player start. Count each resolved multiweek playoff contest once for W-L-T; only the championship contest can award a title. A playoff appearance counts the qualifying season once, including a qualifying bye. Weekly legs remain available for player starts and individual weekly team-score records; label the week when linking such a performance.

[Sleeper format evidence](sleeper-formats.md) records supported round-type semantics, bracket/weekly identity pairing, raw lower-bracket advancement and coverage gates. Shared `completedContests` filters explicit completion for W-L-T; weekly points and starts use completed `performances`, including the available legs of an unfinished multiweek contest.

Career points sum eligible official scored team performances. Win percentage uses decided contests, with half credit for tied contests. These units differ for a multiweek contest, so do not derive game count from the count of player-point rows.

Completed current-season games count in career/game/player totals. Completed-season awards wait for the season to finish. Champion and runner-up remain unknown until the title contest resolves. The visitor sees historical content, without an ongoing/update-status badge.

## Ranking and tie policy

Use exact source precision, or an exact decimal representation, for calculations and comparisons. Round only for display. Preserve extra decimals needed to distinguish results such as a 0.12-point margin.

Use competition ranks, 1, 2, 2, 4. Equal metric values share their rank. Initial category pages include all entries whose rank is at most 10, including all cutoff ties. Show more extends the rank boundary and never splits an equal-value group. A stable identity/date order may arrange tied rows, but it must not award one a better rank.

Career categories have one aggregate result per person. Season, game, bench and move categories rank individual qualifying performances. A person may appear repeatedly. A player-career contribution category ranks the player/person pair.

Rates require at least one eligible game. Show games or W-L-T next to a rate. A zero-game rate is unknown, not 0%. No additional minimum-game rule is authorized.

## Category catalog

Use these plain names in the four approved Records groups. Legacy exhibit names are historical aliases only, not additional navigation.

| Key | Group and public name | Ranking unit and order | Filters | Primary history destination |
| --- | --- | --- | --- | --- |
| championships | Careers: Most championships | Person's resolved titles, descending | Season or all seasons; no game-scope selector | Career profile, with championship seasons accessible |
| wins | Careers: Most wins | Person's contest wins, descending | Season/all; game scope | Career profile with selected scope |
| win-percentage | Careers: Highest win percentage | Person's win percentage, descending | Season/all; game scope | Career profile with selected scope |
| career-points | Careers: Most career points | Person's official points, descending | Season/all; game scope | Career profile with selected scope |
| winning-streak | Careers: Longest winning streak | Person's consecutive wins, descending | Season/all; game scope | Profile or season history retaining streak interval |
| losing-streak | Careers: Longest losing streak | Person's consecutive losses, descending | Season/all; game scope | Profile or season history retaining streak interval |
| best-without-title | Seasons: Best season without a title | Completed nonchampion team-season dominance, descending | Completed season/all; regular only | Manager-season history |
| unluckiest-season | Seasons: Unluckiest season | Expected wins minus actual wins, descending | Completed season/all; regular only | Manager-season history |
| dominant-season | Seasons: Most dominant season | Completed team-season dominance, descending | Completed season/all; regular only | Manager-season history |
| highest-score | Matchups: Highest team score | Official weekly team performance, descending | Season/all; game scope | Matchup, selected week/team |
| lowest-score | Matchups: Lowest team score | Official weekly team performance, ascending | Season/all; game scope | Matchup, selected week/team |
| closest-game | Matchups: Closest game | Absolute final contest margin, ascending | Season/all; game scope | Matchup |
| biggest-blowout | Matchups: Biggest blowout | Absolute final contest margin, descending | Season/all; game scope | Matchup |
| benched-player | Players: Highest-scoring benched player | Recorded player/team/week bench score, descending | Season/all; game scope | Matchup with selected bench row |
| productive-pickup | Players: Most productive pickup | One completed waiver/free-agent acquisition spell's subsequent starting points, descending | Season/all; game scope | Scoped player contributions with spell/year retained |
| productive-drop | Players: Dropped players who delivered elsewhere | One completed drop's later starting points for other people in that season, descending | Season/all; game scope | Dropping person's season Players view, selected drop event and receiving-person history |
| player-contributions | Players: Most starting points for one manager | Player/person starting points, descending | Season/all; game scope | Person-scoped player history |

Championship totals are title outcomes, not regular-season game statistics. Completed-season filters omit unfinished years from those award candidates. Underlying season pages can still show partial comparisons from completed eligible weeks.

Most wins, losses, ties, points and rates are also available as compact profile facts. Nemesis is contextual to a selected manager's Rivalries view; the approved Records index does not require an extra global nemesis category.

## Basic records

Win percentage = 100 × (wins + 0.5 × ties) / (wins + losses + ties). Preserve ties in records. Display a tie segment when nonzero.

A scoring high/low uses the official team total, not a player sum. A true completed zero qualifies for the low record; an unplayed or missing result never does.

Closest-game margin = absolute difference between final official contest scores. A tied game has margin zero. Biggest blowout uses the same measure descending. A contest appears once, with both people identified. Do not invent close-game or blowout thresholds.

A winning or losing streak follows eligible completed contests in historical order. A tie ends either streak. Career streaks can continue between seasons within the selected scope. Season-specific streaks stop at the boundary. An excluded game is outside that selected scope, not a phantom win or loss. Byes do not extend a streak.

Playoff appearances count a qualifying championship-path season once, including a qualifying bye. A championship comes only from the resolved championship contest. Preserve the official runner-up and bracket path, with no duplicate title or win per leg.

## Season dominance and schedule

For eligible regular-season team-weeks, team PPG = official team points / played team-weeks. League PPG = sum of official team points / eligible team-weeks across that season. Dominance = 100 × (team PPG / league PPG - 1). Use the same eligible completed weeks and official scoring rules. Do not divide raw season totals across eras with different lengths.

An undefined league denominator gives no dominance result. A missing team-week is not a zero. A completed-season ranking requires its necessary coverage to be established.

For a team in a completed week with n eligible scoring teams, expected wins for that week = (number of other teams outscored + 0.5 × number tied) / (n - 1). Require at least two eligible teams and complete required weekly scoring coverage. Sum weekly fractions. Actual wins over the same weeks = wins + 0.5 × ties.

Unluckiest season ranks expected wins minus actual wins, with the largest positive difference first. The season table's Wins vs expected shows actual wins minus expected wins. These have opposite signs intentionally. Example: expected 8.5, actual 6 gives an unluckiest-season value of 2.5 and a season-table value of -2.5.

Best season without a title uses dominance among completed nonchampionship team-seasons. Most dominant season uses the same dominance calculation across all completed candidates. Neither ranks a current unfinished season as a full-season award.

`src/history/season-comparisons.ts` is the shared calculation source for these three categories and the standings comparisons. Keep official totals and weekly fractions as reduced `Exact` rationals through the season sum and rank comparison; convert and round only for display. Nine weeks with one of nine opponents outscored contribute nine fractions of 1/9, exactly one expected win, not a sum of decimal approximations. A tied all-play score contributes exactly one half before the weekly denominator.

Comparisons use played regular-season team-weeks; source-confirmed unpaired byes supply no team score or actual win. The league scoring denominator uses the same completed weeks in which the selected team played. No played weeks, fewer than two eligible weekly scoring teams, or a zero league scoring denominator leave the relevant comparison unknown. Zero league points invalidate dominance while completed all-zero games still have genuine tied results and all-play expectation. Required score/roster coverage is validated by refresh. A source-declared completed season missing scheduled regular weeks rejects publication and retains the previous archive. An unresolved title outcome leaves Best season without a title ineligible, rather than treating every team as a nonchampion; the other two awards can use their established complete regular scoring coverage.

Season award history uses the completed season's latest completed week and its supported year, including supported postseason completion, with no invented calendar date. The award's recognition period is separate from its regular-only calculation inputs. Category links open the manager-season history. Season comparison values display at one decimal; this does not change exact ranks. Standings expose `sort=scoring` and `sort=wins-expected`, descending with unknown values last, while retaining official standings as the default. Displayed Wins vs expected is actual minus expected, the exact negative of the Unluckiest season measure.

## Rivalries and nemesis

Each selected pair uses completed contests in the selected season/game scope. Show W-L-T, meetings, average official margin from the first person's perspective, and the current streak. Changing the pair order reverses score-margin signs and W/L perspective.

Average margin = sum of first person's final scores minus opponent's final scores, divided by meetings. A tie contributes zero margin and ends a winning/losing streak. Zero meetings has no average or streak.

A person's nemesis is the opponent with the largest losses-minus-wins value from that person's perspective. Require a positive value. Ties share the result. Include the underlying record/meetings and link to the selected rivalry. If no opponent has a winning record against the person, assign no nemesis.

## Player contributions and bench records

A contribution is a player appearing in the actual starting lineup with a usable recorded player score for that week. Sum only those scores, within the selected person or franchise scope and game scope. Starts count actual starts. Team overrides do not change player totals without player-level source support.

A person scope stops when that person's ownership stops. A franchise scope includes successive owners while retaining attribution. Season totals and linked contributing games must sum consistently.

A bench performance is a player present on the weekly roster and absent from its actual starters, with a usable recorded score. The bench record does not assert that a replacement was legal, avoidable, or would have won the game. The full platform makes no counterfactual substitution claim.

Current position metadata is not proof of historical lineup eligibility. A current team avatar is not an NFL player's photo.

## Acquisition and drop attribution

Use only source-confirmed completed events. A free-agent/waiver add starts an ownership spell; a drop, outgoing trade or end of season ends that spell. A reacquisition is a separate spell. Draft and trade inputs help resolve ownership, but they are not automatically productive-pickup candidates.

Productive pickup = actual starting points for the acquiring person after the add, while that spell continues, within the selected game scope. A franchise query is separately scoped. Do not credit starts before acquisition, after departure, or to the previous owner of a traded draft pick.

Productive drop = later actual starting points for other league people after that drop in the same season, within the selected game scope. Exclude points for the dropping person, including their later reacquisition. The row represents one drop event and retains its dropping-person attribution. Another drop/reacquisition is its own candidate; do not merge distinct events into one ownership spell.

A drop detail retains the dropping person/year at the top and lists actual receiving-person contributions with game links. It can link to each receiving person's scoped player history. Do not put those later points into the dropping person's career contribution total.

Rank observed contributions, with no invented significance cutoff. Contextual Players lists can show the top results and let visitors open the ranked category. Do not add an exhaustive transaction feed, trade-winner formula or draft-value formula.

Exact same-week attribution must be supported by event/lineup ordering. A timestamp-shaped field or weekly leg alone is not proof that the move preceded a player's start. Verify usable semantics and coverage before crediting that week. If this cannot be established, report the concrete gap as a blocker for the agreed claim; do not silently change the start window or fabricate precision.

Keeper flags remain nullable where unknown. Preserve source picks and transaction assets internally so ownership can be reproduced. Unsuccessful or unknown-status events never become completed moves.

## Recent Home results

Select performances currently in a category's first ten ranks, including ties. Order by historical event date, not import time. Deduplicate the same category/result identity. A category entry links to its ranking with that result retained.

For a game or bench score use the played game's date; for a streak use its final counted game; for a completed-season award use the season's completion; for a title use the resolved final. For a career or contribution aggregate use its latest contributing historical event. Derivation alone does not create a new event timestamp.

Use dates at supported precision and stable ordering for equal dates. Do not invent exact kickoff times from a year/week label.

## Coverage and publication

The existing research in [.impeccable/player-impact-feasibility.md](../.impeccable/player-impact-feasibility.md) found player-point fields in one sampled response, not complete historical coverage. Its old Decisions still needed paragraph is superseded by the approved pickup/drop policies above. The audit itself remains unperformed.

Initial implementation must establish linked-season, completed-game, lineup, player-point and completed-event coverage for the claims it publishes. Keep missing, empty, zero and incomplete distinct. Preserve the last complete successful snapshot on later failures. Do not mix a new partial import into previously correct public totals.

A required unavailable input blocks publication of the affected derived claim, and a blocked required v1 claim blocks declaring the full release complete. Report the finding to Sam with the exact affected scope and feasible options. No public freshness panel or calculation warning is authorized.

Tests through the import-to-public application boundary must cover ties, source precision, identity replacements, ongoing seasons, official overrides, incomplete inputs, repeat imports, corrections, player bench/start separation, repeated acquisition spells and the two signs of schedule comparison.

## Shared implementation boundary

`src/history/metrics.ts` supplies career facts to manager/franchise profiles, season standings and career rankings. `src/history/decimal.ts` retains reduced BigInt rationals for sums, differences, products, quotients and comparisons. Category comparisons use `Exact.compare`; reduced `Exact.key` values establish canonical equality. Public numeric facts retain their existing shape; convert only after ranking or for display. Never feed a rounded display value back into a calculation.

`src/history/records.ts` registers the four-group category catalog and category candidate calculators. Later category slices supply a calculator on their existing definition and return exact metrics with stable result IDs, relevant historical links, optional secondary identities and a supported historical period. The same persisted visitor reads, ranks, cutoff expansion, sorting and category page apply to all registered calculators. Unregistered categories have no fabricated holder or ranking.

URL parameters are `season`, eligible `scope`, `sort`, `limit` (a rank boundary, initially 10), and optional `result` (stable selected result identity). Sorting rearranges the included canonical places; it does not change them. Show more increases the rank boundary and retains all equal-value rows. Championship links omit game scope.

Historical periods explicitly retain `year`, `week`, and nullable provider `playedAt`. A null exact timestamp does not erase a supported year/week. Category aggregates use the latest contributing period; title results use the resolved title contest. Public labels use `Week N · Year`. These period objects and canonical result IDs are available to recent top-ten selection without inventing dates from refresh time.

Regression handoff: game-margin categories must preserve equality between `100.12 − 100` and `10.25 − 10.13` at exactly `3/25`. Expected-win categories must retain nine fractions of `1/9` as exactly `1/1`. Implement those assertions through their own published visitor reads when those categories are registered. Career publication tests already cover decimal sums, unequal official decimal values, equivalent `1/3` and `2/6` rates, corrections and all cutoff ties.
