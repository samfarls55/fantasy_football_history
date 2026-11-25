import { recordedStarts, type RecordedStart } from './contributions.ts';
import { Exact, exactSum } from './decimal.ts';
import { chances } from './luck.ts';
import type { ManagerStat } from './manager-stats.ts';
import type { CategoryDefinition, RecordCandidate, RecordSelection } from './records.ts';
import type { Archive } from './types.ts';

/** The three players whose teams win most, or least, of the decided games they start. One with as many better players as worse is neither, so nobody is both. */
export function charmCandidates(end: 'best' | 'worst'): NonNullable<CategoryDefinition['candidates']> {
  return (archive, selection) => {
    const contests = new Map(archive.contests.map(contest => [contest.id, contest]));
    const names = new Map(archive.players.map(player => [player.id, player.name]));
    const decided = recordedStarts(archive, {}, selection).filter(start => !contests.get(start.performance.contestId)!.tie);
    const players = [...Map.groupBy(decided, start => start.playerId)].filter(([, starts]) => starts.length >= 5 * (selection.season ? 1 : archive.seasons.length)).map(([id, starts]) => {
      const wins = starts.filter(({ performance }) => contests.get(performance.contestId)!.winnerId === performance.personId).length;
      return { id, wins, losses: starts.length - wins, rate: Exact.from(wins * 100).divide(starts.length) };
    });
    return players.flatMap(({ id, wins, losses, rate }) => {
      const better = players.filter(other => other.rate.compare(rate) > 0).length;
      const worse = players.filter(other => other.rate.compare(rate) < 0).length;
      const [ahead, behind] = end === 'best' ? [better, worse] : [worse, better];
      return ahead < Math.min(3, behind) ? [{ id, name: names.get(id)!, avatar: null, metric: rate, shown: `${wins}–${losses}`, sample: null,
        leaderContext: `${rate.toNumber().toFixed(1)}% of games won`, period: null, href: '' }] : [];
    });
  };
}

/** Each start's share of the official team score. A score of zero or below has no shares. */
export function armyCandidates(archive: Archive, selection: RecordSelection): RecordCandidate[] {
  const contests = new Map(archive.contests.map(contest => [contest.id, contest]));
  const names = new Map([...archive.players, ...archive.people].map(({ id, name }) => [id, name]));
  return recordedStarts(archive, {}, selection).filter(start => start.performance.points > 0).map(({ performance, playerId, points }) => {
    const opponent = contests.get(performance.contestId)!.sides.find(side => side.rosterId !== performance.rosterId)!;
    return { id: `${performance.id}-${playerId}`, personId: performance.personId, name: names.get(playerId)!, avatar: null, metric: Exact.from(points).multiply(100).divide(performance.points), sample: null,
      leaderContext: `${names.get(performance.personId)} · Week ${performance.week} · ${performance.year} · ${points.toFixed(2)} of ${performance.points.toFixed(2)} points vs ${names.get(opponent.personId)}`,
      period: { year: performance.year, week: performance.week, playedAt: performance.playedAt },
      href: `/seasons/${performance.year}/matchups/${performance.contestId}/?scope=regular&week=${performance.week}&player=${playerId}&team=${performance.rosterId}#player-${performance.rosterId}-${playerId}` };
  });
}

/** How many people rostered each player in a regular-season week. One who never moved isn't a journeyman, and neither is a team defense. */
export function journeymanCandidates(archive: Archive, selection: RecordSelection): RecordCandidate[] {
  const managers = new Map<string, Set<string>>();
  for (const row of archive.performances.filter(row => row.competition === 'regular' && (!selection.season || row.year === selection.season))) for (const { playerId } of [...row.starters, ...row.bench]) {
    managers.set(playerId, (managers.get(playerId) ?? new Set()).add(row.personId));
  }
  return archive.players.filter(player => player.position !== 'DEF' && (managers.get(player.id)?.size ?? 0) > 1)
    .map(player => ({ id: player.id, name: player.name, avatar: null, metric: Exact.from(managers.get(player.id)!.size), sample: null, period: null, href: '' }));
}

/** The player each person's lineups, or their opponents', got the most from, every tie named. */
function topPlayer(side: 'own' | 'opponent', total: (starts: RecordedStart[]) => Exact): ManagerStat['values'] {
  return archive => {
    const contests = new Map(archive.contests.map(contest => [contest.id, contest]));
    const names = new Map(archive.players.map(player => [player.id, player.name]));
    const weeks = Map.groupBy(archive.performances.filter(row => row.competition === 'regular'), row => row.personId);
    const starts = Map.groupBy(recordedStarts(archive), ({ performance }) => side === 'own' ? performance.personId
      : contests.get(performance.contestId)!.sides.find(other => other.rosterId !== performance.rosterId)!.personId);
    return new Map([...starts].map(([personId, starts]) => {
      const players = [...Map.groupBy(starts, start => start.playerId)].map(([id, starts]) => ({ name: names.get(id)!, total: total(starts) })).sort((a, b) => b.total.compare(a.total) || a.name.localeCompare(b.name));
      const value = players[0].total;
      return [personId, { value, names: players.filter(player => !player.total.compare(value)).map(player => player.name), sample: chances(weeks.get(personId)!.length, 'week') }];
    }));
  };
}

/** Players' table. */
export const playerStats: ManagerStat[] = [
  { key: 'most-started', place: 'players', label: 'Most-started player', unit: 'starts', displayPrecision: 0, better: 'higher', values: topPlayer('own', starts => Exact.from(starts.length)),
    rule: 'Regular-season weeks in that manager’s starting lineup, all seasons together.' },
  { key: 'scored-most-against', place: 'players', label: 'Scored most against them', unit: 'points', displayPrecision: 2, better: 'higher', values: topPlayer('opponent', starts => exactSum(starts.map(start => start.points))),
    rule: 'What the player scored as a starter against that manager in the regular season, all seasons together.' },
];
