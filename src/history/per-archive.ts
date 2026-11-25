import type { Archive } from './types.ts';

/** Works a result out once per archive. An instance holds its archive between requests, so nothing may change what this returns. */
export function perArchive<T extends object>(work: (archive: Archive) => T): (archive: Archive) => T {
  const known = new WeakMap<Archive, T>();
  return archive => {
    let result = known.get(archive);
    if (!result) known.set(archive, result = work(archive));
    return result;
  };
}
