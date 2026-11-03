import type { Archive, Season } from './types.ts';

type Row = Record<string, unknown>;
function object(value: unknown, label: string): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label}: expected an object`);
  return value as Row;
}
function list(value: unknown, label: string): unknown[] { if (!Array.isArray(value)) throw new Error(`${label}: expected a complete source array`); return value; }
function id(value: unknown, label: string): string { if (typeof value !== 'string' || !value.trim()) throw new Error(`${label}: expected a string ID`); return value; }
function integer(value: unknown, label: string): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error(`${label}: expected a safe nonnegative integer`); return value; }

/** Validate and retain ownership inputs once, at the provider boundary. Raw assets stay internal. */
export async function importOwnershipInputs(archive: Archive, season: Season, get: (path: string) => Promise<unknown>, playerSource: Row) {
  const path = `league/${season.id}`;
  const roster = (value: unknown, label: string) => {
    const result = String(integer(value, label));
    if (!season.teams.some(team => team.rosterId === result)) throw new Error(`${label}: unknown roster ${result}`);
    return result;
  };
  const player = (value: string) => {
    if (archive.players.some(row => row.id === value)) return;
    const source = object(playerSource[value], `players/nfl ${value}`);
    const name = typeof source.full_name === 'string' ? source.full_name : `${source.first_name ?? ''} ${source.last_name ?? ''}`.trim();
    if (!name) throw new Error(`players/nfl ${value}: missing player identity`);
    archive.players.push({ id: value, name, position: typeof source.position === 'string' ? source.position : null });
  };
  const assets = (value: unknown, label: string) => value == null ? {} : Object.fromEntries(Object.entries(object(value, label)).map(([key, value]) => { player(key); return [key, roster(value, label)]; }));
  const drafts = list(await get(`${path}/drafts`), `${path}/drafts`);
  for (const value of drafts) {
    const source = object(value, `${path}/drafts`);
    const draftId = id(source.draft_id, `${path}/drafts draft_id`);
    const picks = list(await get(`draft/${draftId}/picks`), `draft/${draftId}/picks`).map(value => {
      const pick = object(value, `draft/${draftId}/picks`);
      const playerId = id(pick.player_id, `draft/${draftId}/picks player_id`); player(playerId);
      if (pick.is_keeper != null && typeof pick.is_keeper !== 'boolean') throw new Error(`draft/${draftId}/picks: invalid keeper flag`);
      return { playerId, rosterId: pick.roster_id == null ? null : roster(pick.roster_id, `draft/${draftId}/picks roster_id`), keeper: pick.is_keeper == null ? null : pick.is_keeper, source: pick };
    });
    archive.drafts.push({ id: draftId, seasonId: season.id, source, picks });
  }
  const seen = new Map<string, string>();
  const chronology = new Map<string, string>();
  for (let round = 0; round <= Math.max(18, Number(season.settings.last_scored_leg)); round++) {
    const endpoint = `${path}/transactions/${round}`;
    for (const value of list(await get(endpoint), endpoint)) {
      const source = object(value, endpoint);
      const transactionId = id(source.transaction_id, `${endpoint} transaction_id`);
      const serialized = JSON.stringify(source);
      if (seen.has(transactionId)) { if (seen.get(transactionId) !== serialized) throw new Error(`${endpoint}: conflicting transaction ${transactionId}`); continue; }
      seen.set(transactionId, serialized);
      const status = id(source.status, `${endpoint} status`);
      const completedAt = status === 'complete' ? integer(source.status_updated, `${endpoint} status_updated recorded chronology`) : null;
      const week = integer(source.leg, `${endpoint} leg`);
      const adds = assets(source.adds, `${endpoint} adds`);
      const drops = assets(source.drops, `${endpoint} drops`);
      if (status === 'complete') for (const playerId of new Set([...Object.keys(adds), ...Object.keys(drops)])) {
        const key = `${playerId}:${week}:${completedAt}`;
        if (chronology.has(key)) throw new Error(`${endpoint}: ambiguous recorded chronology for player ${playerId}, week ${week}`);
        chronology.set(key, transactionId);
      }
      archive.transactions.push({ id: transactionId, seasonId: season.id, year: season.year, week,
        type: id(source.type, `${endpoint} type`), status, completedAt, adds, drops, source, orderingSupported: false });
    }
  }
}
