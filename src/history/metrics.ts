import { Exact, exactSum } from './decimal.ts';
import { completedContests, inScope } from './scope.ts';
import type { Archive, Scope } from './types.ts';
export interface MetricSelection { scope?: Scope; season?: string }
export interface MetricIdentity { personId?: string; franchiseId?: string }
export interface CareerFacts {
  wins: number; losses: number; ties: number; games: number; record: string;
  winPercentage: number | null; points: number; championships: number; playoffAppearances: number;
}
/** One calculation for rankings, careers and season standings, at source precision. */
export function careerMetrics(archive: Archive, identity: MetricIdentity, options: MetricSelection = {}) {
  const includes = (row: { personId: string; franchiseId: string }) => identity.personId ? row.personId === identity.personId : row.franchiseId === identity.franchiseId;
  const seasons = archive.seasons.filter(season => !options.season || season.year === options.season);
  const seasonIds = new Set(seasons.map(season => season.id));
  const games = completedContests(archive, options).filter(game => seasonIds.has(game.seasonId) && game.sides.some(includes));
  const wins = games.filter(game => game.sides.some(side => includes(side) && side.personId === game.winnerId)).length;
  const ties = games.filter(game => game.tie).length;
  const losses = games.length - wins - ties;
  const performances = archive.performances.filter(row => includes(row) && seasonIds.has(row.seasonId) && inScope(row.competition, options.scope ?? 'regular'));
  const points = exactSum(performances.map(row => row.points));
  const actualWins = Exact.from(wins).add(Exact.from(ties).divide(2));
  const winPercentage = games.length ? actualWins.multiply(100).divide(games.length) : null;
  const owned = (season: typeof seasons[number]) => season.teams.filter(includes).map(team => team.personId);
  const titleSeasons = seasons.filter(season => season.championId && owned(season).includes(season.championId));
  const facts: CareerFacts = { wins, losses, ties, games: games.length, record: `${wins}–${losses}${ties ? `–${ties}` : ''}`, winPercentage: winPercentage?.toNumber() ?? null,
    points: points.toNumber(), championships: titleSeasons.length, playoffAppearances: seasons.filter(season => season.playoffPersonIds.some(id => owned(season).includes(id))).length };
  return { facts, points, actualWins, winPercentage, games, performances, titleSeasons };
}
export function careerFacts(archive: Archive, identity: MetricIdentity, options: MetricSelection = {}): CareerFacts {
  return careerMetrics(archive, identity, options).facts;
}
