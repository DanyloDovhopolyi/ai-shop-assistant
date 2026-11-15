/**
 * Caches an async function by key, in memory, with least-recently-used
 * eviction. Concurrent calls for one key share a single promise; a rejected
 * promise is dropped, so failures are retried instead of remembered.
 * Only for functions whose result depends on the key alone.
 */
export function memoizeAsync<V>(
  load: (key: string) => Promise<V>,
  { maxEntries }: { readonly maxEntries: number },
): (key: string) => Promise<V> {
  // A Map keeps insertion order: re-inserting on use makes the first key the oldest.
  const entries = new Map<string, Promise<V>>();

  return (key) => {
    const hit = entries.get(key);
    if (hit) {
      entries.delete(key);
      entries.set(key, hit);
      return hit;
    }

    const pending = load(key);
    entries.set(key, pending);
    pending.catch(() => {
      if (entries.get(key) === pending) entries.delete(key);
    });
    if (entries.size > maxEntries) {
      const oldest = entries.keys().next().value;
      if (oldest !== undefined) entries.delete(oldest);
    }
    return pending;
  };
}
