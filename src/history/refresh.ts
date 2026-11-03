import { loadArchive, publishArchive, configuredStorePath } from './store.ts';
import type { Archive, Provider, RefreshOptions, RefreshResult, Season, SeasonTeam, ContestSide, BracketEntry } from './types.ts';
import { sumPoints } from './decimal.ts';

type ObjectValue = Record<string, unknown>;
function object(value: unknown, path: string): ObjectValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path}: expected an object, received missing or invalid source data`);
  return value as ObjectValue;
}
function list(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${path}: expected a complete source array`);
  return value;
}
function string(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${path}: expected a nonempty string ID or label`);
  return value;
}
function number(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${path}: missing or invalid numeric value`);
  return value;
}
function integer(value: unknown, path: string): number {
  const result = number(value, path);
  if (!Number.isSafeInteger(result) || result < 0) throw new Error(`${path}: expected a safe nonnegative integer`);
  return result;
}
function sourceId(value: unknown, path: string): string { return String(integer(value, path)); }

function bracketEntries(value: unknown, path: string, season: Season, family: BracketEntry['family']): BracketEntry[] {
  const playoffStart = Number(season.settings.playoff_week_start);
  const from = (value: unknown): BracketEntry['fromA'] => {
    if (value == null) return null;
    const edge = object(value, `${path} progression`);
    const outcome = edge.w != null ? 'w' : 'l';
    return { outcome, match: integer(edge[outcome], `${path} progression ${outcome}`) };
  };
  const entries = list(value, path).map((value): BracketEntry => {
    const row = object(value, path);
    const match = integer(row.m, `${path} m`);
    const round = integer(row.r, `${path} r`);
    const roster = (value: unknown) => value == null ? null : sourceId(value, `${path} roster`);
    return { id: `${season.id}-${family}-m${match}`, family, competition: family === 'losers' ? 'consolation' : 'placement', championship: false, round, match, rosterA: roster(row.t1), rosterB: roster(row.t2), winnerRosterId: roster(row.w), loserRosterId: roster(row.l), placement: row.p == null ? null : integer(row.p, `${path} p`), contestId: null, weeks: [playoffStart + round - 1], bye: false, fromA: from(row.t1_from), fromB: from(row.t2_from) };
  });
  const roundType = season.settings.playoff_round_type;
  if (entries.length && roundType != null && ![0, 1, 2].includes(roundType as number)) throw new Error(`${path}: unsupported playoff_round_type ${String(roundType)}`);
  if (entries.length && [1, 2].includes(roundType as number) && Number(season.year) < 2021) throw new Error(`${path}: unverified historical playoff_round_type ${String(roundType)} in ${season.year}`);
  if (entries.length && roundType == null && !season.complete) throw new Error(`${path}: missing playoff_round_type requires completed pairing evidence`);
  if (season.settings.playoff_round_type === 1 && Number(season.year) >= 2021) {
    const terminalRound = Math.max(...entries.map(entry => entry.round));
    for (const entry of entries) if (entry.round === terminalRound) entry.weeks.push(entry.weeks[0] + 1);
  }
  if (season.settings.playoff_round_type === 2 && Number(season.year) >= 2021) {
    for (const entry of entries) {
      const first = playoffStart + 2 * (entry.round - 1);
      entry.weeks = [first, first + 1];
    }
  }
  if (new Set(entries.map(entry => entry.match)).size !== entries.length) throw new Error(`${path}: duplicate bracket match`);
  if (family === 'winners' && entries.length) {
    const finals = entries.filter(entry => entry.placement === 1);
    if (finals.length !== 1) throw new Error(`${path}: championship path needs one title contest`);
    const visit = (entry: BracketEntry, ancestors: Set<number>) => {
      if (ancestors.has(entry.match)) throw new Error(`${path}: cyclic bracket progression`);
      entry.competition = 'playoffs';
      for (const edge of [entry.fromA, entry.fromB]) {
        if (!edge) continue;
        if (edge.outcome !== 'w') throw new Error(`${path}: title path contains a loser edge`);
        const parent = entries.find(item => item.match === edge.match);
        if (!parent || parent.round >= entry.round) throw new Error(`${path}: invalid bracket progression`);
        visit(parent, new Set([...ancestors, entry.match]));
      }
    };
    finals[0].championship = true;
    visit(finals[0], new Set());
    for (const entry of entries) if (entry.competition !== 'playoffs' && entry.placement === null && ![entry.fromA, entry.fromB].some(edge => edge?.outcome === 'l')) throw new Error(`${path}: unclassified main-bracket contest ${entry.match}; missing championship ancestry`);
  }
  return entries;
}

export const sleeperProvider: Provider = {
  async get(path) {
    const response = await fetch(`https://api.sleeper.app/v1/${path}`, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`${path}: Sleeper returned ${response.status}`);
    return response.json();
  },
};

/** The only untrusted provider boundary. Build the full candidate before publication. */
export async function refresh(options: RefreshOptions = {}): Promise<RefreshResult> {
  const leagueId = string(options.leagueId ?? process.env.SLEEPER_LEAGUE_ID ?? '1385327861673529344', 'league ID');
  const storePath = configuredStorePath(options.storePath);
  const provider = options.provider ?? sleeperProvider;
  const archive: Archive = {
    version: 1, leagueId, importedAt: (options.now ?? new Date()).toISOString(),
    seasons: [], people: [], franchises: [], contests: [], performances: [], players: [],
    transactions: [], drafts: [], coverage: [], source: {},
  };
  async function get(path: string): Promise<unknown> {
    try {
      const value = await provider.get(path);
      archive.source[path] = value;
      return value;
    } catch (error) { throw new Error(`${path}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  const state = object(await get('state/nfl'), 'state/nfl');
  const stateSeason = string(state.season, 'state/nfl season');
  const stateWeek = integer(state.week, 'state/nfl week');
  const playerSource = object(await get('players/nfl'), 'players/nfl');
  let next: string | null = leagueId;
  const seen = new Set<string>();
  while (next) {
    if (seen.has(next)) throw new Error(`Linked season cycle at ${next}`);
    seen.add(next);
    const path: string = `league/${next}`;
    const league = object(await get(path), path);
    const id = string(league.league_id, `${path} league_id`);
    if (id !== next) throw new Error(`${path}: mismatched league ID`);
    const year = string(league.season, `${path} season`);
    if (!/^\d{4}$/.test(year) || archive.seasons.some(season => season.year === year)) throw new Error(`${path}: invalid or repeated season year`);
    const settings = object(league.settings, `${path} settings`);
    const scoring = Object.fromEntries(Object.entries(object(league.scoring_settings, `${path} scoring`)).map(([key, value]) => [key, number(value, `${path} scoring ${key}`)]));
    const rosterPositions = list(league.roster_positions, `${path} roster_positions`).map((value, index) => string(value, `${path} slot ${index}`));
    const complete = league.status === 'complete';
    const start = integer(settings.start_week, `${path} start_week`);
    const playoffStart = integer(settings.playoff_week_start, `${path} playoff_week_start`);
    const lastScored = integer(settings.last_scored_leg, `${path} last_scored_leg`);
    if (start < 1 || playoffStart <= start || lastScored > 22) throw new Error(`${path}: unsupported week coverage`);
    // A numeric score/leg alone is not completion evidence. Current weeks require
    // both league scoring progress and an NFL week that has already ended.
    if (!complete && year > stateSeason) throw new Error(`${path}: season lies after available NFL state`);
    const lastComplete = complete || year < stateSeason ? lastScored : Math.min(lastScored, Math.max(0, stateWeek - 1));
    const completedWeeks = Array.from({ length: Math.max(0, lastComplete - start + 1) }, (_, index) => start + index);
    const previousLeagueId: string | null = league.previous_league_id == null ? null : string(league.previous_league_id, `${path} previous_league_id`);
    const users = list(await get(`${path}/users`), `${path}/users`).map((value, index) => {
      const user = object(value, `${path}/users ${index}`);
      return { accountId: string(user.user_id, `${path}/users user_id`), name: string(user.display_name, `${path}/users display_name`), avatar: user.avatar == null ? null : string(user.avatar, `${path}/users avatar`) };
    });
    if (new Set(users.map(user => user.accountId)).size !== users.length) throw new Error(`${path}/users: duplicate account ID`);
    const rosters = list(await get(`${path}/rosters`), `${path}/rosters`);
    if (rosters.length !== integer(league.total_rosters, `${path} total_rosters`)) throw new Error(`${path}/rosters: incomplete roster coverage`);
    const teams: SeasonTeam[] = rosters.map((value, index) => {
      const roster = object(value, `${path}/rosters ${index}`);
      const rosterId = sourceId(roster.roster_id, `${path}/rosters roster_id`);
      const accountId = string(roster.owner_id, `${path}/rosters owner_id`);
      const user = users.find(user => user.accountId === accountId);
      if (!user) throw new Error(`${path}/rosters: no identity for account ${accountId}`);
      const personId = `person-${accountId}`;
      const franchiseId = `franchise-${rosterId}`;
      const avatar = user.avatar ? `https://sleepercdn.com/avatars/${encodeURIComponent(user.avatar)}` : null;
      if (!archive.people.some(person => person.id === personId)) archive.people.push({ id: personId, ...user, avatar, current: archive.seasons.length === 0 });
      const metadata = roster.metadata == null ? null : object(roster.metadata, `${path}/rosters metadata`);
      const historicalName = typeof metadata?.team_name === 'string' && metadata.team_name.trim() ? metadata.team_name : null;
      if (!archive.franchises.some(franchise => franchise.id === franchiseId)) archive.franchises.push({ id: franchiseId, rosterId, name: historicalName ?? user.name });
      return { id: `${id}-${rosterId}`, rosterId, personId, franchiseId, name: historicalName ?? user.name, nameSource: historicalName ? 'historical-roster' : 'account-fallback', avatar, standing: null, finish: null, playoffSeed: null };
    });
    if (new Set(teams.map(team => team.rosterId)).size !== teams.length) throw new Error(`${path}/rosters: duplicate roster ID`);
    const season: Season = { id, year, name: string(league.name, `${path} name`), previousLeagueId, complete, completedWeeks, regularWeeks: completedWeeks.filter(week => week < playoffStart), teams, scoring, settings, rosterPositions, championId: null, runnerUpId: null, playoffPersonIds: [], bracket: [] };
    archive.seasons.push(season);
    season.bracket = [
      ...bracketEntries(await get(`${path}/winners_bracket`), `${path}/winners_bracket`, season, 'winners'),
      ...bracketEntries(await get(`${path}/losers_bracket`), `${path}/losers_bracket`, season, 'losers'),
    ];
    for (const week of completedWeeks) {
      const weekPath = `${path}/matchups/${week}`;
      const rows = list(await get(weekPath), weekPath).map((value, index) => {
        const row = object(value, `${weekPath} ${index}`);
        const rosterId = sourceId(row.roster_id, `${weekPath} roster_id`);
        const team = teams.find(team => team.rosterId === rosterId);
        if (!team) throw new Error(`${weekPath}: unknown roster ${rosterId}`);
        const sourcePoints = number(row.points, `${weekPath} points`);
        const overridePoints = row.custom_points == null ? null : number(row.custom_points, `${weekPath} custom_points`);
        const matchupId = row.matchup_id == null ? null : sourceId(row.matchup_id, `${weekPath} matchup_id`);
        const starters = list(row.starters, `${weekPath} starters`).map((value, index) => value == null ? '0' : string(value, `${weekPath} starter ${index}`));
        const players = list(row.players, `${weekPath} players`).map(value => string(value, `${weekPath} player`));
        const playerPoints = object(row.players_points, `${weekPath} players_points`);
        const starterPoints = list(row.starters_points, `${weekPath} starters_points`);
        const slots = rosterPositions.filter(slot => !['BN', 'IR', 'TAXI'].includes(slot));
        const lineup = starters.flatMap((playerId, index) => {
          if (playerId === '0') return [];
          const recorded = playerPoints[playerId] ?? starterPoints[index];
          if (matchupId !== null && recorded == null) throw new Error(`${weekPath}: missing starter points for roster ${rosterId}, player ${playerId}; player contribution coverage is incomplete`);
          return [{ playerId, slot: slots[index] ?? null, points: recorded == null ? null : number(recorded, `${weekPath} starter points`) }];
        });
        const bench = players.filter(playerId => !starters.includes(playerId) && playerId !== '0').map(playerId => ({ playerId, slot: null, points: playerPoints[playerId] == null ? null : number(playerPoints[playerId], `${weekPath} bench points`) }));
        for (const player of bench) if (matchupId !== null && player.points === null) archive.coverage.push({ seasonId: id, area: 'player-points', detail: `${weekPath}: missing bench points for roster ${rosterId}, player ${player.playerId}`, blocks: ['benched-player'] });
        for (const playerId of [...starters, ...players]) {
          if (playerId === '0' || archive.players.some(player => player.id === playerId)) continue;
          const source = playerSource[playerId] == null ? null : object(playerSource[playerId], `players/nfl ${playerId}`);
          archive.players.push({ id: playerId, name: typeof source?.full_name === 'string' && source.full_name.trim() ? source.full_name : `Player ${playerId}`, position: typeof source?.position === 'string' ? source.position : null });
        }
        return { team, sourcePoints, overridePoints, points: overridePoints ?? sourcePoints, matchupId, starters: lineup, bench };
      });
      if (rows.length !== teams.length || new Set(rows.map(row => row.team.rosterId)).size !== teams.length) throw new Error(`${weekPath}: incomplete weekly roster coverage`);
      const pairs = new Map<string, typeof rows>();
      for (const row of rows) {
        if (row.matchupId === null) continue;
        const pair = pairs.get(row.matchupId) ?? [];
        pair.push(row); pairs.set(row.matchupId, pair);
      }
      for (const [matchupId, pair] of pairs) {
        if (pair.length !== 2) throw new Error(`${weekPath}: matchup ${matchupId} does not have two sides`);
        const bracket = week < playoffStart ? null : season.bracket.filter(entry => entry.weeks.includes(week) && [entry.rosterA, entry.rosterB].every(rosterId => pair.some(row => row.team.rosterId === rosterId)));
        if (bracket && bracket.length !== 1) throw new Error(`${weekPath}: cannot unambiguously match roster pair to supported bracket contest`);
        const entry = bracket?.[0];
        const competition = entry?.competition ?? 'regular';
        const contestId = entry?.id ?? `${id}-w${week}-m${matchupId}`;
        const sides = pair.map(({ team, points }): ContestSide => ({ personId: team.personId, franchiseId: team.franchiseId, rosterId: team.rosterId, teamName: team.name, points })) as [ContestSide, ContestSide];
        const tie = sides[0].points === sides[1].points;
        const winnerId = tie ? null : sides[sides[0].points > sides[1].points ? 0 : 1].personId;
        const performanceIds = pair.map(row => `${id}-w${week}-r${row.team.rosterId}`);
        const existing = archive.contests.find(game => game.id === contestId);
        if (existing) {
          existing.performanceIds.push(...performanceIds);
          for (const side of existing.sides) side.points = sumPoints([...archive.performances.filter(performance => performance.contestId === contestId && performance.rosterId === side.rosterId).map(performance => performance.points), sides.find(item => item.rosterId === side.rosterId)!.points]);
        } else archive.contests.push({ id: contestId, seasonId: id, year, competition, weeks: entry?.weeks ?? [week], sides, performanceIds, winnerId, tie, championship: entry?.championship ?? false, round: entry?.round ?? null, complete: !entry, bracketId: entry?.id ?? null, playedAt: null });
        if (entry) entry.contestId = contestId;
        for (const row of pair) archive.performances.push({ id: `${id}-w${week}-r${row.team.rosterId}`, contestId, seasonId: id, year, week, personId: row.team.personId, franchiseId: row.team.franchiseId, rosterId: row.team.rosterId, teamName: row.team.name, competition, points: row.points, sourcePoints: row.sourcePoints, overridePoints: row.overridePoints, weeklyMatchupId: matchupId, starters: row.starters, bench: row.bench, playedAt: null });
      }
    }
    for (const entry of season.bracket) {
      if (entry.rosterA === null || entry.rosterB === null) continue;
      const contest = archive.contests.find(game => game.id === entry.id);
      for (const week of entry.weeks.filter(week => completedWeeks.includes(week))) {
        if (archive.performances.filter(performance => performance.contestId === entry.id && performance.week === week).length !== 2) throw new Error(`${path}: missing paired bracket leg for ${entry.family} match ${entry.match}, week ${week}`);
      }
      if (!contest) continue;
      contest.complete = entry.weeks.every(week => completedWeeks.includes(week)) && entry.winnerRosterId !== null && entry.loserRosterId !== null && [entry.rosterA, entry.rosterB].includes(entry.winnerRosterId) && [entry.rosterA, entry.rosterB].includes(entry.loserRosterId) && entry.winnerRosterId !== entry.loserRosterId;
      contest.tie = contest.complete && contest.sides[0].points === contest.sides[1].points;
      contest.winnerId = !contest.complete || contest.tie ? null : contest.sides[contest.sides[0].points > contest.sides[1].points ? 0 : 1].personId;
    }
    if (settings.playoff_round_type == null && season.bracket.some(entry => !archive.contests.some(contest => contest.id === entry.id && contest.complete))) throw new Error(`${path}: missing playoff_round_type lacks complete actual pairing evidence`);
    // Direct entrants include qualifying byes. Before the regular season ends,
    // provider brackets can still be provisional standings rather than qualifiers.
    if (completedWeeks.includes(playoffStart - 1)) {
      const qualifiers = season.bracket.filter(entry => entry.competition === 'playoffs').flatMap(entry => [
        entry.fromA ? null : entry.rosterA,
        entry.fromB ? null : entry.rosterB,
      ]).filter((rosterId): rosterId is string => rosterId !== null);
      season.playoffPersonIds = [...new Set(qualifiers.map(rosterId => {
        const team = teams.find(team => team.rosterId === rosterId);
        if (!team) throw new Error(`${path}: unknown qualifying roster ${rosterId}`);
        return team.personId;
      }))];
    }
    const title = season.bracket.find(entry => entry.championship);
    const titleContest = title && archive.contests.find(contest => contest.id === title.contestId && contest.complete);
    if (title && titleContest) {
      const scoredWinner = titleContest.sides.find(side => side.personId === titleContest.winnerId);
      if (!titleContest.tie && scoredWinner?.rosterId !== title.winnerRosterId) throw new Error(`${path}: title advancement contradicts official score`);
      season.championId = teams.find(team => team.rosterId === title.winnerRosterId)!.personId;
      season.runnerUpId = teams.find(team => team.rosterId === title.loserRosterId)!.personId;
    }
    // Bracket placement is a final finish, independent of the regular-season standing.
    // In the supported type-0 toilet bowl, raw winners advance toward LAST place.
    for (const entry of season.bracket) {
      if (!entry.placement || !archive.contests.some(contest => contest.id === entry.contestId && contest.complete)) continue;
      let winnerFinish: number;
      let loserFinish: number;
      if (entry.family === 'winners') {
        winnerFinish = entry.placement;
        loserFinish = entry.placement + 1;
      } else if (settings.playoff_type === 0) {
        winnerFinish = teams.length - entry.placement + 1;
        loserFinish = winnerFinish - 1;
        if (loserFinish <= Number(settings.playoff_teams)) continue;
      } else continue;
      if (winnerFinish > teams.length || loserFinish > teams.length) continue;
      for (const [rosterId, finish] of [[entry.winnerRosterId, winnerFinish], [entry.loserRosterId, loserFinish]] as const) {
        const team = teams.find(team => team.rosterId === rosterId)!;
        if (team.finish !== null && team.finish !== finish) throw new Error(`${path}: contradictory final placement for roster ${rosterId}`);
        team.finish = finish;
      }
    }
    next = previousLeagueId;
  }
  archive.seasons.sort((a, b) => b.year.localeCompare(a.year));
  const previous = await loadArchive(storePath);
  const changed = JSON.stringify(previous && { ...previous, importedAt: '' }) !== JSON.stringify({ ...archive, importedAt: '' });
  await publishArchive(archive, storePath);
  return { archive, changed, storePath };
}
