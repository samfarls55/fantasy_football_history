import type { Player } from './types.ts';

/** College and birth date from one player-list entry; anything Sleeper leaves out, mangles or fills with a word for none stays unknown. */
export function playerBackground(source: Record<string, unknown> | null): Pick<Player, 'college' | 'birthDate'> {
  const college = typeof source?.college === 'string' ? source.college.trim() : '';
  const birthDate = typeof source?.birth_date === 'string' ? source.birth_date : '';
  return { college: /^(no college|none|null)?$/i.test(college) ? null : college, birthDate: /^\d{4}-\d{2}-\d{2}$/.test(birthDate) && Number.isFinite(Date.parse(birthDate)) ? birthDate : null };
}
