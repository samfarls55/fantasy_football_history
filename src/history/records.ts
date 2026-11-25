import { readArchive } from './store.ts';
import { Exact } from './decimal.ts';
import { careerMetrics } from './metrics.ts';
import { pickupCandidates } from './pickups.ts';
import { dropCandidates } from './drops.ts';
import { exCandidates } from './ex.ts';
import { lopsidedTradeCandidates } from './lopsided-trades.ts';
import { bridesmaidCandidates } from './careers.ts';
import { contributionCandidates } from './contributions.ts';
import { beltCandidates } from './belt.ts';
import { pickCandidates, slotCandidates } from './drafts.ts';
import { benchCandidates } from './bench.ts';
import { lowestStarterCandidates, worstManagedCandidates } from './lineups.ts';
import { marginCandidates, scoreCandidates, streakCandidates } from './game-records.ts';
import { resultCandidates } from './luck.ts';
import { gameScopes } from './scope.ts';
import { seasonCandidates } from './season-comparisons.ts';
import type { Place } from './tabs.ts';
import type { Archive, Scope } from './types.ts';

export const recordGroups = ['Careers', 'Seasons', 'Matchups', 'Players'] as const;
export type RecordGroup = typeof recordGroups[number];
export interface HistoricalPeriod { year: string; week: number; playedAt: string | null }
export function comparePeriods(a: HistoricalPeriod | null, b: HistoricalPeriod | null): number {
  if (!a || !b) return a ? 1 : b ? -1 : 0;
  return a.year.localeCompare(b.year) || a.week - b.week || (a.playedAt ?? '').localeCompare(b.playedAt ?? '');
}
export function periodLabel(period: HistoricalPeriod | null): string { return period ? `Week ${period.week} · ${period.year}` : '—'; }
export function latestPeriod(rows: HistoricalPeriod[]): HistoricalPeriod | null { return rows.reduce<HistoricalPeriod | null>((latest, row) => comparePeriods(row, latest) > 0 ? { year: row.year, week: row.week, playedAt: row.playedAt } : latest, null); }
export interface RecordCandidate {
  /** A record a draft slot holds has no person. */
  id: string; personId?: string; name: string; avatar: string | null; metric: Exact;
  sample: string | null; period: HistoricalPeriod | null; href: string;
  detail?: string; matchupLabel?: string;
  /** Matchup records: the second person, and whether the game was tied or the first person lost it, so they didn't beat them. */
  opponentId?: string; tied?: boolean; lost?: boolean;
  /** Trades: what each side received, and what it scored for them. */
  sides?: { manager: string; received: string[]; points: number }[];
  /** Season records: the regular-season record and points per game behind the figure. */
  record?: string; pointsPerGame?: number; leaderContext?: string; historyLabel?: string; secondary?: { name: string; href: string }[];
  /** Slot records: who won from it, and when. */
  winners?: { personId: string; year: string }[];
}
export interface RecordSelection { storePath?: string; season?: string; scope?: Scope; sort?: string; limit?: number; result?: string }
export interface CategoryDefinition {
  key: string; name: string; group: RecordGroup;
  /** Where its card lives. A record without a place shows on manager pages alone. */
  place?: Place;
  /** Left out of its place when this other record already names every result that leads it. */
  unless?: string;
  /** What the figure counts, shown beside it; a percent figure carries its own sign too when it compares with the league. */
  unit: string; percent?: boolean; signed?: boolean;
  displayPrecision: number;
  /** One line on how the record is counted. */
  rule: string;
  /** A record nobody wants. */
  shame?: boolean;
  /** Player records: what the manager did with the player. */
  verb?: string;
  /** What to call the places below first when all of them show, rather than the runners-up. */
  rest?: string;
  scope: 'games' | 'none' | 'regular'; order?: 'ascending' | 'descending'; completedSeasons?: boolean;
  candidates?: (archive: Archive, selection: RecordSelection) => RecordCandidate[];
}
type CareerCategory = 'championships' | 'wins' | 'win-percentage' | 'career-points';
function careerCandidates(key: CareerCategory): NonNullable<CategoryDefinition['candidates']> {
  return (archive, selection) => archive.people.filter(person => archive.seasons.some(season => (!selection.season || season.year === selection.season) && season.teams.some(team => team.personId === person.id))).flatMap(person => {
    const metrics = careerMetrics(archive, { personId: person.id }, selection);
    const metric = key === 'career-points' ? metrics.points : key === 'win-percentage' ? metrics.winPercentage : Exact.from(key === 'wins' ? metrics.facts.wins : metrics.facts.championships);
    if (!metric) return [];
    const latestTeam = archive.seasons.flatMap(season => season.teams.filter(team => team.personId === person.id).map(team => ({ year: season.year, team }))).sort((a, b) => b.year.localeCompare(a.year))[0].team;
    const contributing = key === 'championships' ? archive.contests.filter(game => game.complete && game.championship && metrics.titleSeasons.some(season => season.id === game.seasonId)) : key === 'wins' ? metrics.games.filter(game => game.winnerId === person.id) : key === 'win-percentage' ? metrics.games : metrics.performances;
    const periods = contributing.map(row => ({ year: row.year, week: 'week' in row ? row.week : Math.max(...row.weeks), playedAt: row.playedAt }));
    const query = new URLSearchParams();
    if (selection.season) query.set('season', selection.season);
    if (key !== 'championships') query.set('scope', selection.scope ?? 'regular');
    return [{ id: person.id, personId: person.id, name: person.name, avatar: latestTeam.avatar, metric,
      sample: key === 'win-percentage' ? `${metrics.facts.record} · ${metrics.facts.games} ${metrics.facts.games === 1 ? 'game' : 'games'}` : null,
      period: latestPeriod(periods), href: `/managers/${person.id}/${query.size ? `?${query}` : ''}`, historyLabel: 'Open career' }];
  });
}
/** Register future category calculators here; all categories use the same ranking/read/page flow. Cards on a tab follow this order two to a row, so opposites sit together. */
export const recordCategories: CategoryDefinition[] = [
  { key: 'championships', name: 'Most championships', group: 'Careers', unit: 'titles', displayPrecision: 0, scope: 'none', candidates: careerCandidates('championships'),
    rule: 'Championship games won.' },
  { key: 'wins', name: 'Most wins', group: 'Careers', unit: 'wins', displayPrecision: 0, scope: 'games', candidates: careerCandidates('wins'),
    rule: 'Regular-season games won, all seasons together.' },
  { key: 'win-percentage', name: 'Highest win percentage', group: 'Careers', unit: 'of games won', percent: true, displayPrecision: 1, scope: 'games', candidates: careerCandidates('win-percentage'),
    rule: 'Regular-season games won, with a tie counting as half a win.' },
  { key: 'career-points', name: 'Most career points', group: 'Careers', unit: 'points', displayPrecision: 2, scope: 'games', candidates: careerCandidates('career-points'),
    rule: 'Official regular-season scores added up, all seasons together.' },
  { key: 'best-without-title', name: 'Best season without a title', group: 'Seasons', place: 'home', unit: 'vs league avg', percent: true, signed: true, displayPrecision: 1, shame: true, scope: 'regular', completedSeasons: true, candidates: seasonCandidates('best-without-title'),
    rule: 'Their regular-season points per game vs the league average, among teams that didn’t win the title.' },
  { key: 'luckiest-season', name: 'Luckiest season', group: 'Seasons', place: 'luck', unit: 'more wins than their scores earned', displayPrecision: 1, scope: 'regular', completedSeasons: true, candidates: seasonCandidates('luckiest-season'),
    rule: 'Each regular-season week counts as the share of the league they outscored. Added up, that’s the wins their scores earned; this is how many extra they got.' },
  { key: 'unluckiest-season', name: 'Unluckiest season', group: 'Seasons', place: 'luck', unit: 'fewer wins than their scores earned', displayPrecision: 1, shame: true, scope: 'regular', completedSeasons: true, candidates: seasonCandidates('unluckiest-season'),
    rule: 'Each regular-season week counts as the share of the league they outscored. Added up, that’s the wins their scores earned; this is how many they fell short.' },
  { key: 'points-in-win', name: 'Fewest points in a win', group: 'Matchups', place: 'luck', unit: 'points', displayPrecision: 2, scope: 'regular', order: 'ascending', candidates: resultCandidates('won'),
    rule: 'The winner’s official score in a regular-season game. A tie isn’t a win.' },
  { key: 'points-in-loss', name: 'Most points in a loss', group: 'Matchups', place: 'luck', unit: 'points', displayPrecision: 2, shame: true, scope: 'regular', candidates: resultCandidates('lost'),
    rule: 'The loser’s official score in a regular-season game. A tie isn’t a loss.' },
  { key: 'dominant-season', name: 'Most dominant season', group: 'Seasons', place: 'legacy', unless: 'best-without-title', unit: 'vs league avg', percent: true, signed: true, displayPrecision: 1, scope: 'regular', completedSeasons: true, candidates: seasonCandidates('dominant-season'),
    rule: 'Their regular-season points per game vs the league average.' },
  { key: 'belt-run', name: 'Longest belt run', group: 'Matchups', place: 'legacy', unit: 'defenses', displayPrecision: 0, scope: 'none', candidates: beltCandidates,
    rule: 'Games in one reign the belt holder didn’t lose, regular season and championship playoffs together.' },
  { key: 'bridesmaid', name: 'Most finals lost without a title', group: 'Careers', place: 'legacy', unit: 'finals lost', displayPrecision: 0, shame: true, scope: 'none', candidates: bridesmaidCandidates,
    rule: 'Championship games lost by managers who have never won one.' },
  { key: 'highest-score', name: 'Highest score', group: 'Matchups', place: 'games', unit: 'points', displayPrecision: 2, scope: 'games', candidates: scoreCandidates,
    rule: 'A team’s official score for one regular-season week.' },
  { key: 'lowest-score', name: 'Lowest score', group: 'Matchups', place: 'games', unit: 'points', displayPrecision: 2, shame: true, scope: 'games', order: 'ascending', candidates: scoreCandidates,
    rule: 'A team’s official score for one regular-season week. A real zero counts; an unplayed week doesn’t.' },
  { key: 'biggest-blowout', name: 'Biggest blowout', group: 'Matchups', place: 'games', unit: 'point margin', displayPrecision: 2, scope: 'games', candidates: marginCandidates,
    rule: 'The gap between the two final scores of a regular-season game.' },
  { key: 'closest-game', name: 'Closest game', group: 'Matchups', place: 'games', unit: 'point margin', displayPrecision: 2, scope: 'games', order: 'ascending', candidates: marginCandidates,
    rule: 'The gap between the two final scores of a regular-season game. A tie counts as zero.' },
  { key: 'winning-streak', name: 'Longest winning streak', group: 'Careers', place: 'games', unit: 'wins in a row', displayPrecision: 0, scope: 'games', candidates: streakCandidates('winning'),
    rule: 'Regular-season wins in a row, carried from one season into the next. A tie ends it.' },
  { key: 'losing-streak', name: 'Longest losing streak', group: 'Careers', place: 'games', unit: 'losses in a row', displayPrecision: 0, shame: true, scope: 'games', candidates: streakCandidates('losing'),
    rule: 'Regular-season losses in a row, carried from one season into the next. A tie ends it.' },
  { key: 'worst-managed-week', name: 'Worst-managed week', group: 'Matchups', place: 'lineups', unit: 'points short of their best lineup', displayPrecision: 2, shame: true, scope: 'regular', candidates: worstManagedCandidates,
    rule: 'What the best legal lineup from that regular-season week’s roster would have added. Positions are current ones, plus any slot the player has started in here.' },
  { key: 'benched-player', name: 'Most points left on the bench', group: 'Players', place: 'lineups', unit: 'points', displayPrecision: 2, verb: 'benched', shame: true, scope: 'games', candidates: benchCandidates,
    rule: 'A player’s score in a regular-season week spent on the bench.' },
  { key: 'lowest-starter', name: 'Lowest starter score', group: 'Players', place: 'lineups', unit: 'points', displayPrecision: 2, verb: 'started', shame: true, scope: 'games', order: 'ascending', candidates: lowestStarterCandidates,
    rule: 'A player’s recorded score in a regular-season starting lineup. An empty slot doesn’t count.' },
  { key: 'productive-pickup', name: 'Best pickup', group: 'Players', place: 'moves', unit: 'points as a starter', displayPrecision: 2, verb: 'picked up', scope: 'games', candidates: pickupCandidates,
    rule: 'What the player scored as a starter for that manager in the weeks after the pickup, until the manager let the player go or the regular season ended.' },
  { key: 'productive-drop', name: 'Worst drop', group: 'Players', place: 'moves', unit: 'points for other teams', displayPrecision: 2, verb: 'dropped', shame: true, scope: 'games', candidates: dropCandidates,
    rule: 'What the player scored in other managers’ starting lineups in the weeks after the drop, through the end of that regular season.' },
  { key: 'the-ex', name: 'The ex: most points against the manager who let him go', group: 'Players', place: 'moves', unit: 'points against that manager', displayPrecision: 2, verb: 'let go of', shame: true, scope: 'games', candidates: exCandidates,
    rule: 'What the player scored as a starter against the manager who dropped or traded him, in later regular-season weeks that season, until that manager got him back.' },
  { key: 'lopsided-trade', name: 'Most lopsided trade', group: 'Players', place: 'moves', unit: 'more points as starters', displayPrecision: 2, scope: 'games', candidates: lopsidedTradeCandidates,
    rule: 'The gap between what each side’s new players scored in its starting lineups in the weeks after the trade, until each player left or that regular season ended. Only trades between two managers, with no picks or waiver budget.' },
  { key: 'player-contributions', name: 'Most points for one manager', group: 'Players', place: 'players', unit: 'points as a starter', displayPrecision: 2, verb: 'started', scope: 'games', candidates: contributionCandidates,
    rule: 'What the player scored in that manager’s regular-season starting lineups, all seasons together.' },
  { key: 'best-steal', name: 'Best steal', group: 'Players', place: 'draft', unit: 'points as a starter', displayPrecision: 2, verb: 'drafted', scope: 'regular', completedSeasons: true, candidates: pickCandidates('best-steal'),
    rule: 'What a pick from the second half of the rounds scored in the drafter’s regular-season starting lineups that season. Finished seasons with a snake or linear draft of full rosters; known keepers don’t count.' },
  { key: 'worst-bust', name: 'Worst bust', group: 'Players', place: 'draft', unit: 'points as a starter', displayPrecision: 2, verb: 'drafted', shame: true, scope: 'regular', order: 'ascending', completedSeasons: true, candidates: pickCandidates('worst-bust'),
    rule: 'What a first-round pick scored in the drafter’s regular-season starting lineups that season. Finished seasons with a snake or linear draft of full rosters; known keepers don’t count.' },
  { key: 'titles-by-slot', name: 'Titles by draft slot', group: 'Seasons', place: 'draft', unit: 'titles', displayPrecision: 0, rest: 'Other slots', scope: 'none', completedSeasons: true, candidates: slotCandidates,
    rule: 'Champions who drafted from that slot. Seasons with a snake or linear draft of full rosters.' },
];
export const recordSorts = ['rank', 'name', 'newest', 'oldest', 'value-asc'] as const;
export type RecordSort = typeof recordSorts[number];
export function categoryHref(key: string, selection: RecordSelection = {}): string {
  const category = recordCategories.find(category => category.key === key)!;
  const query = new URLSearchParams();
  if (selection.season) query.set('season', selection.season);
  if (category.scope === 'games') query.set('scope', selection.scope ?? 'regular');
  if (selection.sort && selection.sort !== 'rank') query.set('sort', selection.sort);
  if (selection.limit && selection.limit !== 10) query.set('limit', String(selection.limit));
  if (selection.result) query.set('result', selection.result);
  return `/records/${key}/${query.size ? `?${query}` : ''}`;
}
export function recordUnit(unit: string, value: number): string { return value === 1 ? unit.replace(/\blosses\b/, 'loss').replace(/\b(points|titles|wins|games|defenses|starts|times|pickups|claims|trades|lineups|starters|places|seasons|trips|finals)\b/g, word => word.slice(0, -1)) : unit; }
export function formatRecordValue(value: number, maximumFractionDigits = 8): string { return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value); }
const byName = new Intl.Collator(undefined, { numeric: true }).compare;
function rankCategory(archive: Archive, category: CategoryDefinition, options: RecordSelection) {
  const seasons = archive.seasons.filter(season => !category.completedSeasons || season.complete).map(season => season.year);
  const season = seasons.includes(options.season!) ? options.season : undefined;
  const scope = category.scope === 'none' ? undefined : category.scope === 'regular' ? 'regular' : gameScopes.includes(options.scope!) ? options.scope! : 'regular';
  const sort: RecordSort = recordSorts.includes(options.sort as RecordSort) ? options.sort as RecordSort : 'rank';
  let limit = Number.isSafeInteger(options.limit) && options.limit! >= 10 ? options.limit! : 10;
  const selection = { season, scope, sort, limit };
  const seasonId = archive.seasons.find(row => row.year === season)?.id;
  const blocked = archive.coverage.some(issue => issue.blocks.includes(category.key) && (!seasonId || !issue.seasonId || issue.seasonId === seasonId));
  const candidates = (blocked ? [] : category.candidates!(archive, selection)).sort((a, b) => (category.order === 'ascending' ? a.metric.compare(b.metric) : b.metric.compare(a.metric)) || byName(a.name, b.name) || a.id.localeCompare(b.id));
  let displayPrecision = category.displayPrecision;
  if (category.percent) {
    const values = [...new Map(candidates.map(row => [row.metric.key, row.metric.toNumber()])).values()];
    // Add decimals only when distinct ranked values would otherwise share a label.
    while (displayPrecision < 20 && values.some((value, index) => index > 0 && formatRecordValue(value, displayPrecision) === formatRecordValue(values[index - 1], displayPrecision))) displayPrecision++;
  }
  const nameOf = new Map(archive.people.map(person => [person.id, person.name]));
  let rank = 1;
  const ranked = candidates.map((row, index) => {
    if (index && row.metric.compare(candidates[index - 1].metric)) rank = index + 1;
    const { metric, ...rest } = row;
    return { ...rest, manager: nameOf.get(row.personId!), opponent: nameOf.get(row.opponentId!), winners: row.winners?.map(winner => ({ manager: nameOf.get(winner.personId)!, year: winner.year })), rank, value: metric.toNumber(), exactKey: metric.key };
  });
  const selectedResult = ranked.find(row => row.id === options.result);
  limit = Math.max(limit, selectedResult?.rank ?? 10);
  selection.limit = limit;
  const leaders = ranked.filter(row => row.rank === 1);
  let rows = ranked.filter(row => row.rank <= limit);
  if (sort === 'name') rows.sort((a, b) => a.name.localeCompare(b.name) || a.rank - b.rank || a.id.localeCompare(b.id));
  if (sort === 'newest' || sort === 'oldest') rows.sort((a, b) => (sort === 'oldest' ? 1 : -1) * comparePeriods(a.period, b.period) || a.rank - b.rank || a.id.localeCompare(b.id));
  if (sort === 'value-asc') rows.sort((a, b) => {
    const left = candidates.find(row => row.id === a.id)!.metric;
    const right = candidates.find(row => row.id === b.id)!.metric;
    return left.compare(right) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
  });
  const result = selectedResult?.id;
  const nextRank = ranked.find(row => row.rank > limit)?.rank;
  const nextLimit = nextRank ? Math.max(limit + 10, nextRank) : null;
  return { category: { ...category, displayPrecision }, seasons, season, scope: scope ?? null, sort, limit, result, rows, leaders, blocked, total: ranked.length, nextLimit,
    href: categoryHref(category.key, { ...selection, result }), nextHref: nextLimit ? categoryHref(category.key, { ...selection, result, limit: nextLimit }) : null };
}
/** Whether anyone holds the record in this league. */
export function hasRecord(archive: Archive, category: CategoryDefinition): boolean {
  return rankCategory(archive, category, {}).leaders.length > 0;
}
/** Visitor reads always load the durable publication, never an in-flight refresh candidate. */
export async function readCategory(key: string, options: RecordSelection = {}) {
  const category = recordCategories.find(category => category.key === key && category.candidates);
  if (!category) return null;
  const archive = await readArchive(options.storePath);
  return archive ? rankCategory(archive, category, options) : null;
}
/** The record cards of these places, in registry order. A record nobody holds has no card, nor does one another record already tells. */
export async function readPlaceRecords(places: readonly Place[], options: { storePath?: string } = {}) {
  const archive = await readArchive(options.storePath);
  if (!archive) return null;
  const rank = (category: CategoryDefinition) => rankCategory(archive, category, {});
  return recordCategories.filter(category => category.place && places.includes(category.place)).map(rank).filter(({ category, leaders }) => {
    const told = recordCategories.filter(other => other.key === category.unless).flatMap(other => rank(other).leaders);
    return leaders.some(row => !told.some(other => other.id === row.id));
  });
}
/** Every record a person holds or shares, fame before shame. A count of zero holds nothing, and a tied game belongs to both managers. */
export async function readRecordsHeld(personId: string, options: { storePath?: string } = {}) {
  const archive = await readArchive(options.storePath);
  if (!archive) return null;
  return recordCategories.filter(category => category.candidates).map(category => rankCategory(archive, category, {}))
    .filter(view => view.leaders.some(row => (row.personId === personId || row.tied && row.opponentId === personId) && (row.value !== 0 || view.category.order === 'ascending')))
    .sort((a, b) => Number(a.category.shame ?? false) - Number(b.category.shame ?? false));
}
export async function readRecordCollection(options: { storePath?: string } = {}) {
  const archive = await readArchive(options.storePath);
  if (!archive) return null;
  return recordGroups.map(name => ({ name, categories: recordCategories.filter(category => category.group === name).map(category => {
    const view = category.candidates ? rankCategory(archive, category, {}) : null;
    return { ...category, displayPrecision: view?.category.displayPrecision, leaders: view?.leaders ?? [], href: view ? categoryHref(category.key) : null };
  }) }));
}

const homeCategories = ['best-without-title', 'benched-player', 'unluckiest-season', 'productive-pickup', 'productive-drop', 'winning-streak'];
/** One publication supplies the entire Home, including every category's recent places. */
export async function readHome(options: { storePath?: string } = {}) {
  const archive = await readArchive(options.storePath);
  if (!archive) return null;
  const categories = recordCategories.filter(category => category.candidates).map(category => rankCategory(archive, category, {}));
  const identity = (row: ReturnType<typeof rankCategory>['rows'][number]) => {
    const owner = archive.people.find(person => person.id === row.personId)!;
    return { ...row, owner: { id: owner.id, name: owner.name, avatar: owner.avatar } };
  };
  const features = homeCategories.map(key => {
    const view = categories.find(view => view.category.key === key)!;
    return { category: view.category, leaders: view.leaders.map(identity), blocked: view.blocked, href: categoryHref(key) };
  });
  const candidates = [...new Map(categories.flatMap(view => view.rows.filter(row => row.period).map(row => ({
    ...identity(row), category: view.category, categoryHref: categoryHref(view.category.key, { result: row.id }),
  }))).map(row => [`${row.category.key}/${row.id}`, row])).values()]
    .sort((a, b) => comparePeriods(b.period, a.period) || a.category.key.localeCompare(b.category.key) || a.id.localeCompare(b.id));
  // Give each category a place before filling spare places with repeated categories.
  const selected = new Set<typeof candidates[number]>();
  const selectedCategories = new Set<string>();
  for (const row of candidates) {
    if (selectedCategories.has(row.category.key)) continue;
    selected.add(row);
    selectedCategories.add(row.category.key);
    if (selected.size === 6) break;
  }
  for (const row of candidates) {
    if (selected.size === 6) break;
    selected.add(row);
  }
  const recent = candidates.filter(row => selected.has(row));
  return { features, recent };
}
