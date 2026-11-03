import { readArchive } from './store.ts';
import { Exact } from './decimal.ts';
import { careerMetrics } from './metrics.ts';
import { pickupCandidates } from './pickups.ts';
import { dropCandidates } from './drops.ts';
import { contributionCandidates } from './contributions.ts';
import { benchCandidates } from './bench.ts';
import { marginCandidates, scoreCandidates, streakCandidates } from './game-records.ts';
import { gameScopes } from './scope.ts';
import { seasonCandidates } from './season-comparisons.ts';
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
  id: string; personId: string; name: string; avatar: string | null; metric: Exact;
  sample: string | null; period: HistoricalPeriod | null; href: string;
  detail?: string; leaderContext?: string; historyLabel?: string; secondary?: { name: string; href: string }[];
}
export interface RecordSelection { storePath?: string; season?: string; scope?: Scope; sort?: string; limit?: number; result?: string }
export interface CategoryDefinition {
  key: string; name: string; group: RecordGroup; unit: string;
  valueLabel?: string;
  displayPrecision?: number;
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
/** Register future category calculators here; all categories use the same ranking/read/page flow. */
export const recordCategories: CategoryDefinition[] = [
  { key: 'championships', name: 'Most championships', group: 'Careers', unit: 'titles', scope: 'none', candidates: careerCandidates('championships') },
  { key: 'wins', name: 'Most wins', group: 'Careers', unit: 'wins', scope: 'games', candidates: careerCandidates('wins') },
  { key: 'win-percentage', name: 'Highest win percentage', group: 'Careers', unit: '%', scope: 'games', candidates: careerCandidates('win-percentage') },
  { key: 'career-points', name: 'Most career points', group: 'Careers', unit: 'points', scope: 'games', candidates: careerCandidates('career-points') },
  { key: 'winning-streak', name: 'Longest winning streak', group: 'Careers', unit: 'games', scope: 'games', candidates: streakCandidates('winning') },
  { key: 'losing-streak', name: 'Longest losing streak', group: 'Careers', unit: 'games', scope: 'games', candidates: streakCandidates('losing') },
  { key: 'best-without-title', name: 'Best season without a title', group: 'Seasons', unit: '%', valueLabel: 'Scoring vs league', displayPrecision: 1, scope: 'regular', completedSeasons: true, candidates: seasonCandidates('best-without-title') },
  { key: 'unluckiest-season', name: 'Unluckiest season', group: 'Seasons', unit: 'wins below expected', displayPrecision: 1, scope: 'regular', completedSeasons: true, candidates: seasonCandidates('unluckiest-season') },
  { key: 'dominant-season', name: 'Most dominant season', group: 'Seasons', unit: '%', valueLabel: 'Scoring vs league', displayPrecision: 1, scope: 'regular', completedSeasons: true, candidates: seasonCandidates('dominant-season') },
  { key: 'highest-score', name: 'Highest team score', group: 'Matchups', unit: 'points', scope: 'games', candidates: scoreCandidates },
  { key: 'lowest-score', name: 'Lowest team score', group: 'Matchups', unit: 'points', scope: 'games', order: 'ascending', candidates: scoreCandidates },
  { key: 'closest-game', name: 'Closest game', group: 'Matchups', unit: 'points', scope: 'games', order: 'ascending', candidates: marginCandidates },
  { key: 'biggest-blowout', name: 'Biggest blowout', group: 'Matchups', unit: 'points', scope: 'games', candidates: marginCandidates },
  { key: 'benched-player', name: 'Highest-scoring benched player', group: 'Players', unit: 'points', scope: 'games', candidates: benchCandidates },
  { key: 'productive-pickup', name: 'Most productive pickup', group: 'Players', unit: 'starting points', scope: 'games', candidates: pickupCandidates },
  { key: 'productive-drop', name: 'Dropped players who delivered elsewhere', group: 'Players', unit: 'starting points elsewhere', scope: 'games', candidates: dropCandidates },
  { key: 'player-contributions', name: 'Most starting points for one manager', group: 'Players', unit: 'points', scope: 'games', candidates: contributionCandidates },
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
export function recordUnit(unit: string, value: number): string { return value === 1 ? unit.replace(/\b(points|titles|wins|games)\b/g, word => word.slice(0, -1)) : unit; }
export function formatRecordValue(value: number, maximumFractionDigits = 8): string { return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value); }
function rankCategory(archive: Archive, category: CategoryDefinition, options: RecordSelection) {
  const seasons = archive.seasons.filter(season => !category.completedSeasons || season.complete).map(season => season.year);
  const season = seasons.includes(options.season!) ? options.season : undefined;
  const scope = category.scope === 'none' ? undefined : category.scope === 'regular' ? 'regular' : gameScopes.includes(options.scope!) ? options.scope! : 'regular';
  const sort: RecordSort = recordSorts.includes(options.sort as RecordSort) ? options.sort as RecordSort : 'rank';
  let limit = Number.isSafeInteger(options.limit) && options.limit! >= 10 ? options.limit! : 10;
  const selection = { season, scope, sort, limit };
  const seasonId = archive.seasons.find(row => row.year === season)?.id;
  const blocked = archive.coverage.some(issue => issue.blocks.includes(category.key) && (!seasonId || !issue.seasonId || issue.seasonId === seasonId));
  const candidates = (blocked ? [] : category.candidates!(archive, selection)).sort((a, b) => (category.order === 'ascending' ? a.metric.compare(b.metric) : b.metric.compare(a.metric)) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  let rank = 1;
  const ranked = candidates.map((row, index) => {
    if (index && row.metric.compare(candidates[index - 1].metric)) rank = index + 1;
    const { metric, ...rest } = row;
    return { ...rest, rank, value: metric.toNumber(), exactKey: metric.key };
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
  return { category, seasons, season, scope: scope ?? null, sort, limit, result, rows, leaders, blocked, total: ranked.length, nextLimit,
    href: categoryHref(category.key, { ...selection, result }), nextHref: nextLimit ? categoryHref(category.key, { ...selection, result, limit: nextLimit }) : null };
}
/** Visitor reads always load the durable publication, never an in-flight refresh candidate. */
export async function readCategory(key: string, options: RecordSelection = {}) {
  const category = recordCategories.find(category => category.key === key && category.candidates);
  if (!category) return null;
  const archive = await readArchive(options.storePath);
  return archive ? rankCategory(archive, category, options) : null;
}
export async function readRecordCollection(options: { storePath?: string } = {}) {
  const archive = await readArchive(options.storePath);
  if (!archive) return null;
  return recordGroups.map(name => ({ name, categories: recordCategories.filter(category => category.group === name).map(category => ({ ...category, leaders: category.candidates ? rankCategory(archive, category, {}).leaders : [], href: category.candidates ? categoryHref(category.key) : null })) }));
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
