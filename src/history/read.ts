import { readArchive } from './store.ts';
import type { Archive, Season, SeasonTeam, Scope } from './types.ts';
import { careerMetrics } from './metrics.ts';
import { inScope } from './scope.ts';
import { seasonComparisons } from './season-comparisons.ts';
export { completedContests, inScope, gameScopes, competitionLabels } from './scope.ts';

export const standingSorts = ['standing', 'name', 'record', 'points', 'scoring', 'wins-expected'] as const;
export type StandingSort = typeof standingSorts[number];
export interface StandingRow extends SeasonTeam {
  personName: string; record: string; wins: number; losses: number; ties: number; points: number;
  scoringVsLeague: number | null; expectedWins: number | null; expectedWinsExactKey: string | null; winsVsExpected: number | null;
}

function honors(archive: Archive, season: Season) {
  return { champion: archive.people.find(person => person.id === season.championId) ?? null, runnerUp: archive.people.find(person => person.id === season.runnerUpId) ?? null };
}

export async function readSeasons(storePath?: string) {
  const archive = await readArchive(storePath);
  return archive?.seasons.map(season => ({ ...season, ...honors(archive, season) })) ?? null;
}

function standings(archive: Archive, season: Season, scope: Scope) {
  const comparisons = seasonComparisons(archive, season);
  const rows = season.teams.map(team => {
    const metrics = careerMetrics(archive, { franchiseId: team.franchiseId }, { season: season.year, scope });
    const { wins, losses, ties, points, record } = metrics.facts;
    const comparison = comparisons.find(row => row.teamId === team.id)!;
    return { ...team, personName: archive.people.find(person => person.id === team.personId)!.name, wins, losses, ties, points, record, metrics, comparison,
      scoringVsLeague: comparison.dominance?.toNumber() ?? null, expectedWins: comparison.expectedWins?.toNumber() ?? null,
      expectedWinsExactKey: comparison.expectedWins?.key ?? null, winsVsExpected: comparison.winsVsExpected?.toNumber() ?? null };
  });
  rows.sort((a, b) => b.metrics.actualWins.compare(a.metrics.actualWins) || b.metrics.points.compare(a.metrics.points) || a.rosterId.localeCompare(b.rosterId));
  let standing = 1;
  for (const [index, row] of rows.entries()) {
    if (index && (row.metrics.actualWins.compare(rows[index - 1].metrics.actualWins) || row.metrics.points.compare(rows[index - 1].metrics.points))) standing = index + 1;
    row.standing = standing;
  }
  return rows;
}

/** Visitor-facing read model; all routes consume the same imported history. */
export async function readSeason(year: string, options: { storePath?: string; sort?: StandingSort; scope?: Scope } = {}) {
  const archive = await readArchive(options.storePath);
  const season = archive?.seasons.find(season => season.year === year);
  if (!archive || !season) return null;
  const rows = standings(archive, season, options.scope ?? 'regular');
  if (options.sort === 'name') rows.sort((a, b) => a.personName.localeCompare(b.personName));
  if (options.sort === 'points') rows.sort((a, b) => b.metrics.points.compare(a.metrics.points) || a.personName.localeCompare(b.personName));
  if (options.sort === 'scoring' || options.sort === 'wins-expected') {
    const key = options.sort === 'scoring' ? 'dominance' : 'winsVsExpected';
    rows.sort((a, b) => {
      const left = a.comparison[key], right = b.comparison[key];
      return (left && right ? right.compare(left) : left ? -1 : right ? 1 : 0) || a.personName.localeCompare(b.personName);
    });
  }
  return { ...season, ...honors(archive, season), rows: rows.map(({ metrics, comparison, ...row }) => row) };
}

export const bracketScopes = ['playoffs', 'consolation', 'placement'] as const;
export type BracketScope = typeof bracketScopes[number];

/** Historical bracket results share contest completion and source advancement. */
export async function readSeasonBracket(year: string, options: { storePath?: string; scope?: BracketScope } = {}) {
  const archive = await readArchive(options.storePath);
  const season = archive?.seasons.find(season => season.year === year);
  if (!archive || !season) return null;
  const scope = options.scope ?? 'playoffs';
  const started = season.completedWeeks.includes(Number(season.settings.playoff_week_start) - 1);
  const availableScopes = bracketScopes.filter(scope => season.bracket.some(entry => inScope(entry.competition, scope)));
  const entries = season.bracket.filter(entry => inScope(entry.competition, scope));
  const games = entries.map(entry => {
    const contest = archive.contests.find(contest => contest.id === entry.contestId);
    const complete = contest?.complete ?? false;
    const sides = ([['rosterA', 'fromA'], ['rosterB', 'fromB']] as const).map(([roster, from]) => {
      const team = season.teams.find(team => team.rosterId === entry[roster]);
      const edge = entry[from];
      const parent = edge && season.bracket.find(parent => parent.family === entry.family && parent.match === edge.match);
      const parentResolved = parent && archive.contests.some(contest => contest.id === parent.contestId && contest.complete);
      if (!started || !team || edge && !parentResolved) return null;
      return { ...team, personName: archive.people.find(person => person.id === team.personId)!.name, points: complete ? contest!.sides.find(side => side.rosterId === team.rosterId)!.points : null };
    });
    const lastLeg = archive.performances.filter(performance => performance.contestId === contest?.id).map(performance => performance.week).sort((a, b) => a - b).at(-1);
    return { ...entry, sides, complete, winnerId: contest?.winnerId ?? null, tie: contest?.tie ?? false, advancingRosterId: complete ? entry.winnerRosterId : null, href: lastLeg ? `/seasons/${year}/matchups/${contest!.id}/?scope=${scope}&week=${lastLeg}` : null };
  });
  const rounds = [...new Set(entries.map(entry => entry.round))].sort((a, b) => a - b).map(round => ({ round, games: games.filter(game => game.round === round) }));
  const firstRound = Math.min(...season.bracket.filter(entry => entry.competition === 'playoffs').map(entry => entry.round));
  const byes = started && scope === 'playoffs' ? season.teams.filter(team => entries.some(entry => entry.round > firstRound && (entry.rosterA === team.rosterId && !entry.fromA || entry.rosterB === team.rosterId && !entry.fromB))).map(team => ({ ...team, personName: archive.people.find(person => person.id === team.personId)!.name })) : [];
  return { year, scope, availableScopes, rounds, byes };
}

/** Completed weekly legs remain visitable even while the encompassing contest is unresolved. */
export async function readSeasonMatchups(year: string, options: { storePath?: string; scope?: Scope; week?: number } = {}) {
  const archive = await readArchive(options.storePath);
  const season = archive?.seasons.find(season => season.year === year);
  if (!archive || !season) return null;
  const scope = options.scope ?? 'regular';
  const eligible = archive.contests.filter(game => game.seasonId === season.id && inScope(game.competition, scope));
  const weeks = [...new Set(archive.performances.filter(performance => performance.seasonId === season.id && inScope(performance.competition, scope)).map(performance => performance.week))].sort((a, b) => a - b);
  const week = options.week && season.completedWeeks.includes(options.week) ? options.week : weeks.at(-1) ?? season.completedWeeks.at(-1) ?? null;
  const games = eligible.filter(game => game.weeks.includes(week!) && game.performanceIds.some(id => archive.performances.some(performance => performance.id === id && performance.week === week))).map(game => ({ ...game, weeklySides: game.sides.map(side => ({ ...side, points: archive.performances.find(performance => performance.contestId === game.id && performance.week === week && performance.rosterId === side.rosterId)!.points, avatar: season.teams.find(team => team.rosterId === side.rosterId)!.avatar })) }));
  return { year, scope, week, weeks: season.completedWeeks, games };
}

export async function readMatchup(year: string, contestId: string, options: { storePath?: string; week?: number } = {}) {
  const archive = await readArchive(options.storePath);
  const season = archive?.seasons.find(season => season.year === year);
  const contest = archive?.contests.find(game => game.id === contestId && game.seasonId === season?.id);
  if (!archive || !season || !contest) return null;
  const performances = archive.performances.filter(performance => performance.contestId === contest.id);
  const weeks = [...new Set(performances.map(performance => performance.week))].sort((a, b) => a - b);
  if (!weeks.length) return null;
  const week = options.week && weeks.includes(options.week) ? options.week : weeks.at(-1)!;
  const lineups = contest.sides.map(side => {
    const performance = performances.find(performance => performance.week === week && performance.rosterId === side.rosterId)!;
    const team = season.teams.find(team => team.rosterId === side.rosterId)!;
    const named = (players: typeof performance.starters) => players.map(player => ({ ...player, name: archive.players.find(item => item.id === player.playerId)?.name ?? `Player ${player.playerId}` }));
    return { ...performance, avatar: team.avatar, personName: archive.people.find(person => person.id === team.personId)!.name, starters: named(performance.starters), bench: named(performance.bench) };
  });
  return { ...contest, week, completedWeeks: weeks, lineups };
}
