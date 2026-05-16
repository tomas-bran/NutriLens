/**
 * Minimal in-process key/value cache with optional TTL.
 *
 * Per spec E02 §4 / E01 §6.2 the extraction pipeline caches `extract:<hash>:<promptVersion>`
 * so repeat uploads of the same file (same hash) skip the IA call. For the
 * MVP this lives in the Node process — every cold start re-populates. When we
 * outgrow that, swap the impl for Redis without touching callers.
 */
interface Entry<V> {
  value: V;
  expiresAt: number | null;
}

const store = new Map<string, Entry<unknown>>();

export const cache = {
  get<V>(key: string): V | undefined {
    const e = store.get(key);
    if (!e) return undefined;
    if (e.expiresAt !== null && e.expiresAt < Date.now()) {
      store.delete(key);
      return undefined;
    }
    return e.value as V;
  },

  set<V>(key: string, value: V, opts: { ttlSeconds?: number } = {}): void {
    const expiresAt = opts.ttlSeconds ? Date.now() + opts.ttlSeconds * 1000 : null;
    store.set(key, { value, expiresAt });
  },

  delete(key: string): void {
    store.delete(key);
  },

  clear(): void {
    store.clear();
  },

  size(): number {
    return store.size;
  },
};
