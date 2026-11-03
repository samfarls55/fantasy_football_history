import type { Archive } from './types.ts';

export interface OwnershipEvent {
  id: string; transactionId: string; seasonId: string; year: string; week: number;
  playerId: string; rosterId: string; personId: string; franchiseId: string;
  direction: 'arrival' | 'departure'; kind: string; recordedAt: number;
}
export interface OwnershipDeparture extends OwnershipEvent { direction: 'departure'; dropCandidate: boolean }
export interface OwnershipSpell {
  id: string; seasonId: string; year: string; playerId: string; rosterId: string; personId: string; franchiseId: string;
  origin: 'draft' | 'observed' | 'transaction'; arrival: OwnershipEvent | null; departure: OwnershipDeparture | null;
  addWeek: number; departureWeek: number | null; pickupCandidate: boolean;
}

/** Recorded event order resolves ownership changes; it makes no claim about NFL kickoff/lineup-lock times. */
export function resolveOwnership(archive: Archive): { events: OwnershipEvent[]; spells: OwnershipSpell[]; departures: OwnershipDeparture[] } {
  const events: OwnershipEvent[] = [], spells: OwnershipSpell[] = [], departures: OwnershipDeparture[] = [];
  for (const season of archive.seasons) {
    const active = new Map<string, OwnershipSpell>();
    const teamFor = (rosterId: string) => season.teams.find(team => team.rosterId === rosterId)!;
    const open = (playerId: string, rosterId: string, origin: OwnershipSpell['origin'], arrival: OwnershipEvent | null) => {
      const team = teamFor(rosterId);
      const spell = { id: arrival?.id ?? `${season.id}:${origin}:${playerId}:${rosterId}`, seasonId: season.id, year: season.year, playerId, rosterId, personId: team.personId, franchiseId: team.franchiseId,
        origin, arrival, departure: null, addWeek: arrival?.week ?? 0, departureWeek: null, pickupCandidate: arrival ? ['waiver', 'free_agent'].includes(arrival.kind) : false };
      spells.push(spell); active.set(playerId, spell);
    };
    for (const draft of archive.drafts.filter(row => row.seasonId === season.id && row.source.status === 'complete')) for (const pick of draft.picks) if (pick.rosterId && !active.has(pick.playerId)) open(pick.playerId, pick.rosterId, 'draft', null);
    const transactions = archive.transactions.filter(row => row.seasonId === season.id && row.status === 'complete').sort((a, b) => a.week - b.week || a.completedAt! - b.completedAt! || a.id.localeCompare(b.id));
    // Weekly roster evidence can establish initial ownership, never a synthetic pickup candidate.
    const firstMoves = new Map<string, number>();
    for (const row of transactions) for (const playerId of [...Object.keys(row.adds), ...Object.keys(row.drops)]) if (!firstMoves.has(playerId)) firstMoves.set(playerId, row.week);
    for (const performance of archive.performances.filter(row => row.seasonId === season.id).sort((a, b) => a.week - b.week)) for (const row of [...performance.starters, ...performance.bench]) {
      if (!active.has(row.playerId) && performance.week < (firstMoves.get(row.playerId) ?? Infinity)) open(row.playerId, performance.rosterId, 'observed', null);
    }
    for (const transaction of transactions) {
      const event = (playerId: string, rosterId: string, direction: OwnershipEvent['direction']): OwnershipEvent => {
        const team = teamFor(rosterId);
        return { id: `${season.id}:${transaction.id}:${playerId}:${rosterId}`, transactionId: transaction.id, seasonId: season.id, year: season.year, week: transaction.week, playerId, rosterId, personId: team.personId, franchiseId: team.franchiseId, direction, kind: transaction.type, recordedAt: transaction.completedAt! };
      };
      const close = (playerId: string, rosterId: string) => {
        const departure: OwnershipDeparture = { ...event(playerId, rosterId, 'departure'), direction: 'departure', dropCandidate: transaction.type !== 'trade' && transaction.drops[playerId] === rosterId };
        events.push(departure); departures.push(departure);
        const spell = active.get(playerId);
        if (spell?.rosterId === rosterId) { spell.departure = departure; spell.departureWeek = transaction.week; active.delete(playerId); }
      };
      for (const [playerId, rosterId] of Object.entries(transaction.drops)) close(playerId, rosterId);
      for (const [playerId, rosterId] of Object.entries(transaction.adds)) {
        const existing = active.get(playerId);
        if (existing) close(playerId, existing.rosterId);
        const arrival = event(playerId, rosterId, 'arrival'); events.push(arrival); open(playerId, rosterId, 'transaction', arrival);
      }
    }
  }
  return { events, spells, departures };
}
