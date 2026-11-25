import { Exact, exactSum } from './decimal.ts';
import { recordedStarts } from './contributions.ts';
import { identity } from './game-records.ts';
import { legResult, managedWeeks, opponentOf } from './performances.ts';
import { perArchive } from './per-archive.ts';
import { startingSlots } from './rosters.ts';
import { plural } from './wording.ts';
import type { ManagerStat, StatValue } from './manager-stats.ts';
import type { CategoryDefinition, RecordSelection } from './records.ts';
import type { Archive, LineupPlayer, Performance } from './types.ts';

const line = ['DL', 'DE', 'DT', 'NT'];
const linebackers = ['LB', 'ILB', 'OLB'];
const backs = ['DB', 'CB', 'S', 'SS', 'FS'];
/** The player-list positions each Sleeper slot takes. Any other slot is unrecognized. */
const slotPositions = new Map<string, string[]>(Object.entries({
  QB: ['QB'], RB: ['RB', 'FB'], WR: ['WR'], TE: ['TE'], K: ['K'], DEF: ['DEF'], DL: line, LB: linebackers, DB: backs,
  FLEX: ['RB', 'FB', 'WR', 'TE'], WRRB_FLEX: ['RB', 'FB', 'WR'], REC_FLEX: ['WR', 'TE'], SUPER_FLEX: ['QB', 'RB', 'FB', 'WR', 'TE'], IDP_FLEX: [...line, ...linebackers, ...backs],
}));

/**
 * The best total a week's roster could start. Each player's points are the same in any slot, so taking players best first,
 * and moving those already in to make room, ends at a best assignment; taking them slot by slot would not.
 */
function bestLineup(players: LineupPlayer[], slots: string[], fits: Map<string, Set<string>>): Exact {
  const filled: (LineupPlayer | undefined)[] = slots.map(() => undefined);
  const place = (player: LineupPlayer, tried: Set<number>): boolean => slots.some((slot, index) => {
    if (tried.has(index) || !fits.get(player.playerId)!.has(slot)) return false;
    tried.add(index);
    const holder = filled[index];
    if (holder && !place(holder, tried)) return false;
    filled[index] = player;
    return true;
  });
  for (const player of players.toSorted((a, b) => b.points! - a.points!)) place(player, new Set());
  return exactSum(filled.map(player => player?.points ?? 0));
}

interface Lineup { own: Performance; opponent: Performance; started: Exact; best: Exact; gap: Exact }
/** Every regular-season lineup beside its week's best one. A week with a slot or score nobody can know is left out. */
const lineups = perArchive((archive): Lineup[] => {
  const fits = new Map(archive.players.map(player => [player.id, new Set([...slotPositions].filter(([, positions]) => positions.includes(player.position!)).map(([slot]) => slot))]));
  for (const own of archive.performances) for (const { playerId, slot } of own.starters) if (slot) fits.get(playerId)!.add(slot);
  const slotsOf = new Map(archive.seasons.map(season => [season.id, startingSlots(season.rosterPositions)]));
  return managedWeeks(archive).filter(own => own.competition === 'regular').flatMap(own => {
    const slots = slotsOf.get(own.seasonId)!;
    const players = [...own.starters, ...own.bench];
    if (!players.length || players.some(player => player.points === null) || own.starters.some(player => player.slot === null) || slots.some(slot => !slotPositions.has(slot))) return [];
    const started = exactSum(own.starters.map(player => player.points!));
    const filled = bestLineup(players, slots, fits);
    // Filling a slot the manager left empty can cost points, so what they started is the floor.
    const best = filled.compare(started) < 0 ? started : filled;
    return [{ own, opponent: opponentOf(archive, own), started, best, gap: best.subtract(started) }];
  });
});

/** Each manager's value over the weeks whose best lineup is known. */
const perManager = (value: (weeks: Lineup[]) => StatValue | null): ManagerStat['values'] => archive =>
  new Map([...Map.groupBy(lineups(archive), ({ own }) => own.personId)].flatMap(([personId, weeks]) => {
    const result = value(weeks);
    return result ? [[personId, result]] : [];
  }));

export const worstManagedCandidates: CategoryDefinition['candidates'] = (archive, selection) =>
  lineups(archive).filter(({ own, gap }) => (!selection.season || own.year === selection.season) && gap.compare(0) > 0).map(({ own, opponent, gap }) => ({
    ...identity(archive, own.personId, own.year), id: own.id, metric: gap, sample: null, opponentId: opponent.personId, result: legResult(own, opponent),
    detail: own.teamName, leaderContext: `Week ${own.week} · ${own.year}`,
    period: { year: own.year, week: own.week, playedAt: own.playedAt },
    href: `/seasons/${own.year}/matchups/${own.contestId}/?scope=regular&week=${own.week}&team=${own.rosterId}`, historyLabel: 'Open matchup',
  }));

/** Starts in lineups their managers set. */
function managedStarts(archive: Archive, selection: RecordSelection = {}) {
  const managed = new Set(managedWeeks(archive));
  return recordedStarts(archive, {}, selection).filter(start => managed.has(start.performance));
}

export const lowestStarterCandidates: CategoryDefinition['candidates'] = (archive, selection) => {
  const people = new Map(archive.people.map(person => [person.id, person.name]));
  const players = new Map(archive.players.map(player => [player.id, player.name]));
  return managedStarts(archive, selection).map(({ performance: own, playerId, points }) => ({
    id: `${own.id}-${playerId}`, personId: own.personId, name: players.get(playerId)!, avatar: null, metric: Exact.from(points), sample: null, opponentId: opponentOf(archive, own).personId,
    leaderContext: `${people.get(own.personId)} · Week ${own.week} · ${own.year}`,
    period: { year: own.year, week: own.week, playedAt: own.playedAt },
    href: `/seasons/${own.year}/matchups/${own.contestId}/?scope=${selection.scope ?? 'regular'}&week=${own.week}&player=${playerId}&team=${own.rosterId}#player-${own.rosterId}-${playerId}`, historyLabel: 'Open matchup',
  }));
};

/** Every rule that judges a lineup says whose positions it goes by. */
export const currentPositions = 'Positions are current ones, plus any slot the player has started in here.';

/** Excuses' Lineups table: the best share of the best lineup ranks first, then the fewest mistakes and the most perfect lineups. */
export const lineupStats: ManagerStat[] = [
  { key: 'lineup-share', place: 'lineups', label: 'Points started, % of best lineup', unit: 'of best lineup', percent: true, displayPrecision: 1, better: 'higher',
    values: perManager(weeks => {
      const best = exactSum(weeks.map(week => week.best));
      return best.compare(0) > 0 ? { value: exactSum(weeks.map(week => week.started)).multiply(100).divide(best), sample: plural(weeks.length, 'week') } : null;
    }),
    rule: `Regular-season starters’ points as a share of the best legal lineup from that week’s roster. ${currentPositions}` },
  { key: 'losses-better-lineup', place: 'lineups', label: 'Losses a better lineup wins', unit: 'losses', displayPrecision: 0, better: 'lower',
    values: perManager(weeks => {
      const lost = weeks.filter(({ own, opponent }) => own.points < opponent.points);
      return { value: Exact.from(lost.filter(({ own, opponent, gap }) => gap.add(own.points).compare(opponent.points) > 0).length), sample: `of ${plural(lost.length, 'loss', 'losses')}` };
    }),
    rule: `Regular-season losses where the official score plus what the best legal lineup would have added beats the opponent’s. ${currentPositions}` },
  { key: 'perfect-lineups', place: 'lineups', label: 'Perfect lineups', unit: 'lineups', displayPrecision: 0, better: 'higher',
    values: perManager(weeks => ({ value: Exact.from(weeks.filter(week => !week.gap.compare(0)).length), sample: plural(weeks.length, 'week') })),
    rule: `Regular-season weeks when no legal lineup from the roster scored more. ${currentPositions}` },
  { key: 'zero-starters', place: 'lineups', label: 'Starters who scored 0', unit: 'starters', displayPrecision: 0, better: 'lower',
    values: archive => new Map([...Map.groupBy(managedStarts(archive), start => start.performance.personId)].map(([personId, starts]) =>
      [personId, { value: Exact.from(starts.filter(start => start.points === 0).length), sample: `of ${plural(starts.length, 'start')}` }])),
    rule: 'Regular-season starters with a recorded score of exactly 0. An empty slot doesn’t count.' },
];
