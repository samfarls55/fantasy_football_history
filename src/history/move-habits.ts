import { playerContributionHref } from './contributions.ts';
import { Exact } from './decimal.ts';
import { chances } from './luck.ts';
import { completedTrades } from './trades.ts';
import type { ManagerStat } from './manager-stats.ts';
import type { RecordCandidate, RecordSelection } from './records.ts';
import type { Archive, Transaction } from './types.ts';

/** Each move with the people who held the rosters it adds a player to that season. */
function adds(archive: Archive, moves: Transaction[]) {
  return moves.flatMap(move => {
    const { teams } = archive.seasons.find(season => season.id === move.seasonId)!;
    return [...new Set(Object.values(move.adds))].map(rosterId => ({ move, personId: teams.find(team => team.rosterId === rosterId)!.personId }));
  });
}
const pickups = (archive: Archive) => adds(archive, archive.transactions.filter(move => move.status === 'complete' && (move.type === 'waiver' || move.type === 'free_agent')));
const failedClaims = (archive: Archive) => adds(archive, archive.transactions.filter(move => move.status === 'failed' && move.type === 'waiver'));

/** Everyone's count, zero included, beside their chances: what they did that could have counted, or else their seasons. A league without a chance has no count. */
function counts(archive: Archive, counted: { personId: string }[], of?: { word: string; tries: { personId: string }[] }): ReturnType<ManagerStat['values']> {
  if (!(of?.tries ?? counted).length) return new Map();
  return new Map(archive.people.map(({ id }) => [id, {
    value: Exact.from(counted.filter(row => row.personId === id).length),
    sample: of ? `of ${chances(of.tries.filter(row => row.personId === id).length, of.word)}`
      : chances(archive.seasons.filter(season => season.teams.some(team => team.personId === id)).length, 'season'),
  }]));
}

const newYork = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', hourCycle: 'h23' });
/** Free-agent pickups completed while New York's clocks showed an hour that counts. A waiver claim completes when Sleeper runs it, so its time says nothing about its maker. */
function timedPickups(inWindow: (weekday: string, hour: number) => boolean): ManagerStat['values'] {
  return archive => {
    const tries = pickups(archive).filter(({ move }) => move.type === 'free_agent');
    const counted = tries.filter(({ move }) => {
      const { weekday, hour } = Object.fromEntries(newYork.formatToParts(move.completedAt!).map(part => [part.type, part.value]));
      return inWindow(weekday, Number(hour));
    });
    return counts(archive, counted, { word: 'free agent', tries });
  };
}

/** Every player one person has picked up more than once. */
export function repeatPickupCandidates(archive: Archive, selection: RecordSelection): RecordCandidate[] {
  const seasons = archive.seasons.filter(season => !selection.season || season.year === selection.season);
  const added = pickups(archive).filter(({ move }) => !selection.season || move.year === selection.season)
    .flatMap(({ move, personId }) => Object.keys(move.adds).map(playerId => ({ move, personId, playerId })));
  return [...Map.groupBy(added, row => `${row.personId}/${row.playerId}`)].filter(([, rows]) => rows.length > 1).map(([id, rows]) => {
    const [{ personId, playerId }] = rows;
    const last = rows.map(({ move }) => move).reduce((latest, move) => move.completedAt! > latest.completedAt! ? move : latest);
    const years = new Set(rows.map(({ move }) => move.year)).size;
    const managed = seasons.filter(season => season.teams.some(team => team.personId === personId)).length;
    return { id, personId, name: archive.players.find(player => player.id === playerId)!.name, avatar: null, metric: Exact.from(rows.length), sample: null,
      leaderContext: `${archive.people.find(person => person.id === personId)!.name} · In ${years} of ${chances(managed, 'season')} · last in Week ${last.week} · ${last.year}`,
      period: { year: last.year, week: last.week, playedAt: null }, href: playerContributionHref({ personId }, playerId, { season: selection.season }) };
  });
}

/** Moves' table: the busiest ranks first. */
export const moveHabitStats: ManagerStat[] = [
  { key: 'pickups', place: 'moves', label: 'Pickups', unit: 'pickups', displayPrecision: 0, better: 'higher',
    values: archive => counts(archive, pickups(archive)),
    rule: 'Players added through completed waiver claims and free-agent moves, in any week.' },
  { key: 'failed-claims', place: 'moves', label: 'Failed claims', unit: 'claims', displayPrecision: 0, better: 'higher',
    values: archive => {
      const failed = failedClaims(archive);
      return counts(archive, failed, { word: 'claim', tries: [...failed, ...pickups(archive).filter(({ move }) => move.type === 'waiver')] });
    },
    rule: 'Waiver claims that failed, whatever the reason.' },
  { key: 'late-night', place: 'moves', label: 'Pickups, midnight–5am ET', unit: 'pickups', displayPrecision: 0, better: 'higher',
    values: timedPickups((_, hour) => hour < 5),
    rule: 'Free-agent pickups completed from midnight up to 5am in New York. Waiver claims don’t count.' },
  { key: 'sunday', place: 'moves', label: 'Pickups, Sunday 11am–1pm ET', unit: 'pickups', displayPrecision: 0, better: 'higher',
    values: timedPickups((weekday, hour) => weekday === 'Sun' && hour >= 11 && hour < 13),
    rule: 'Free-agent pickups completed on a Sunday from 11am up to 1pm in New York. Waiver claims don’t count.' },
  { key: 'trades', place: 'moves', label: 'Trades', unit: 'trades', displayPrecision: 0, better: 'higher',
    values: archive => counts(archive, completedTrades(archive).flatMap(({ personIds }) => personIds.map(personId => ({ personId })))),
    rule: 'Every completed trade, whether for players, picks or waiver budget. A three-team trade counts once for each manager in it.' },
];
