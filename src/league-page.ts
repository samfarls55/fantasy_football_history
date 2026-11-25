import type { AstroGlobal } from 'astro';
import { ensureLeague, leagueStorePath } from './leagues.ts';
import { readSeasons } from './history/read.ts';
import { readManagerStats } from './history/manager-stats.ts';
import { readPlaceRecords } from './history/records.ts';
import { withHistorySnapshot } from './history/store.ts';
import { readTabs, tabs as allTabs, type Place, type TabKey } from './history/tabs.ts';

type Page = Pick<AstroGlobal, 'params' | 'url'>;

type Tabs = NonNullable<Awaited<ReturnType<typeof readTabs>>>;

/** Every page under a league opens the same way: import it if needed, then read its tabs and its whole view from one publication, or say why it can't be shown. */
export async function openLeague<T>(page: Page & Pick<AstroGlobal, 'response'>, read: (storePath: string) => Promise<T>) {
  const id = page.params.id!;
  const { status, archive } = /^\d+$/.test(id) ? await ensureLeague(id) : { status: 'missing' as const, archive: null };
  if (status === 'ready') {
    const storePath = leagueStorePath(id);
    return withHistorySnapshot(archive, async () => ({ failure: null, tabs: (await readTabs({ storePath }))!, view: await read(storePath) }), storePath);
  }
  page.response.status = status === 'missing' ? 404 : 502;
  return { failure: status, tabs: [] as Tabs, view: null };
}

/** A tab's page: its record cards, its manager stats and whatever else it reads, and the frame its layout takes. A tab this league has no stat for sends the visitor Home. */
export async function openTab<T = {}>(page: Page & Pick<AstroGlobal, 'response' | 'redirect'>, key: TabKey, read: (storePath: string) => Promise<T> = async () => ({}) as T) {
  const { places } = allTabs.find(tab => tab.key === key)!;
  const { failure, tabs, view } = await openLeague(page, async storePath => ({
    league: (await readSeasons(storePath))![0].name,
    records: (await readPlaceRecords(places, { storePath }))!,
    stats: (await readManagerStats({ storePath, places }))!,
    ...await read(storePath),
  }));
  const tab = tabs.find(tab => tab.key === key);
  return { redirect: view && !tab ? page.redirect(leagueHref(page)) : null, frame: { failure, tabs, tab, league: view?.league }, view };
}

/** The Sleeper username the visitor looked up, from ?u=. */
export function viewer(page: Page): string {
  return page.url.searchParams.get('u')?.trim() ?? '';
}

/** A link inside this league; ?u= rides along so the visitor stays marked. */
export function leagueHref(page: Page, path = '', query: Record<string, string> = {}): string {
  const u = viewer(page);
  const search = new URLSearchParams({ ...(u && { u }), ...query }).toString();
  return `/leagues/${page.params.id}${path}${search && `?${search}`}`;
}

export function tabHref(page: Page, key: TabKey): string {
  return leagueHref(page, key === 'home' ? '' : `/${key}`);
}

/** A manager stat's column on the tab that has it. */
export function statHref(page: Page, tabs: Tabs, { place, key }: { place: Place; key: string }): string {
  return `${tabHref(page, tabs.find(tab => tab.places.includes(place))!.key)}#${key}`;
}

export function managerHref(page: Page, name: string, query: Record<string, string> = {}): string {
  return leagueHref(page, `/managers/${encodeURIComponent(name)}`, query);
}

export function isViewer(page: Page, name: string): boolean {
  return name.toLowerCase() === viewer(page).toLowerCase();
}

/** Whether a stat's label already says its unit, so a figure beside the label needs none: "Pickups" says "pickups". A unit of several words is known by all but its first, which a count of one changes. */
export function saysUnit(label: string, unit: string): boolean {
  const words = unit.toLowerCase().split(' ');
  return label.toLowerCase().includes(words.slice(words.length > 1 ? 1 : 0).join(' '));
}
export function fixed(number: number, digits: number): string {
  return number.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
