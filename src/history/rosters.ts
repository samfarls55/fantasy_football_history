import { perArchive } from './per-archive.ts';
import type { Archive } from './types.ts';

/** The slots a starter fills, in lineup order. */
export const startingSlots = (rosterPositions: string[]) => rosterPositions.filter(slot => !['BN', 'IR', 'TAXI'].includes(slot));

const managers = perArchive(archive => new Map(archive.seasons.flatMap(season => season.teams.map(team => [`${season.id}/${team.rosterId}`, team.personId]))));
/** Who managed a roster that season. */
export function rosterPerson(archive: Archive, seasonId: string, rosterId: string | null): string | undefined {
  return managers(archive).get(`${seasonId}/${rosterId}`);
}
