import { readArchive } from './store.ts';

/** Edits that turn one name into the other. */
function typos(a: string, b: string): number {
  let row = [...Array(b.length + 1).keys()];
  for (const [i, x] of [...a].entries()) row = [...b].reduce((next, y, j) => [...next, Math.min(row[j + 1] + 1, next[j] + 1, row[j] + Number(x !== y))], [i + 1]);
  return row[b.length];
}

/** The manager a link names, in any letter case, or the nearest name: one it starts, or one a typo or two away (one per four letters). */
export async function readManagerName(name: string, options: { storePath?: string } = {}) {
  const archive = await readArchive(options.storePath);
  if (!archive) return null;
  const typed = name.toLowerCase();
  const named = archive.people.find(person => person.name.toLowerCase() === typed);
  if (named) return { id: named.id, suggestion: null };
  const nearest = archive.people.map(person => ({ name: person.name, cost: typed.length >= 3 && person.name.toLowerCase().startsWith(typed) ? 0 : typos(typed, person.name.toLowerCase()) }))
    .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name))[0];
  return { id: null, suggestion: nearest.cost <= Math.max(1, Math.floor(typed.length / 4)) ? nearest.name : null };
}
