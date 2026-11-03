import type { Archive, Competition, Scope } from './types.ts';
export const gameScopes: Scope[] = ['regular', 'playoffs', 'combined', 'consolation', 'placement'];
export const competitionLabels: Record<Scope, string> = { regular: 'Regular season', playoffs: 'Championship playoffs', combined: 'Regular + playoffs', consolation: 'Consolation', placement: 'Placement' };
export function inScope(competition: Competition, scope: Scope): boolean {
  return scope === 'combined' ? competition === 'regular' || competition === 'playoffs' : competition === scope;
}
/** Finalized W-L-T excludes unfinished multiweek contests; points use weekly performances. */
export function completedContests(archive: Archive, options: { scope?: Scope; seasonId?: string } = {}) {
  return archive.contests.filter(game => game.complete && (!options.seasonId || game.seasonId === options.seasonId) && inScope(game.competition, options.scope ?? 'regular'));
}
