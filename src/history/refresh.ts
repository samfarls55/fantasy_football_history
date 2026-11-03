import { loadArchive, publishArchive, configuredStorePath } from './store.ts';
import type { Archive, Provider, RefreshOptions, RefreshResult, Season, SeasonTeam, ContestSide } from './types.ts';

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
        return { team, sourcePoints, overridePoints, points: overridePoints ?? sourcePoints, matchupId };
      });
      if (rows.length !== teams.length || new Set(rows.map(row => row.team.rosterId)).size !== teams.length) throw new Error(`${weekPath}: incomplete weekly roster coverage`);
      // Postseason pairing/format normalization is owned by the contest slice.
      // Preserve its complete source input without inferring bracket membership.
      if (week >= playoffStart) continue;
      const pairs = new Map<string, typeof rows>();
      for (const row of rows) {
        if (row.matchupId === null) continue;
        const pair = pairs.get(row.matchupId) ?? [];
        pair.push(row); pairs.set(row.matchupId, pair);
      }
      for (const [matchupId, pair] of pairs) {
        if (pair.length !== 2) throw new Error(`${weekPath}: matchup ${matchupId} does not have two sides`);
        const contestId = `${id}-w${week}-m${matchupId}`;
        const sides = pair.map(({ team, points }): ContestSide => ({ personId: team.personId, franchiseId: team.franchiseId, rosterId: team.rosterId, teamName: team.name, points })) as [ContestSide, ContestSide];
        const tie = sides[0].points === sides[1].points;
        const winnerId = tie ? null : sides[sides[0].points > sides[1].points ? 0 : 1].personId;
        archive.contests.push({ id: contestId, seasonId: id, year, competition: 'regular', weeks: [week], sides, performanceIds: pair.map(row => `${id}-w${week}-r${row.team.rosterId}`), winnerId, tie, championship: false, round: null, playedAt: null });
        for (const row of pair) archive.performances.push({ id: `${id}-w${week}-r${row.team.rosterId}`, contestId, seasonId: id, year, week, personId: row.team.personId, franchiseId: row.team.franchiseId, rosterId: row.team.rosterId, teamName: row.team.name, competition: 'regular', points: row.points, sourcePoints: row.sourcePoints, overridePoints: row.overridePoints, starters: [], bench: [], playedAt: null });
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
