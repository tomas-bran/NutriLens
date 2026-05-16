import { afterEach, describe, expect, it, vi } from 'vitest';
import { cache } from '@/lib/cache';

afterEach(() => {
  cache.clear();
  vi.useRealTimers();
});

describe('cache — basic CRUD', () => {
  it('returns undefined for missing keys', () => {
    expect(cache.get('missing')).toBeUndefined();
  });

  it('roundtrips a value', () => {
    cache.set('k', { hello: 'world' });
    expect(cache.get<{ hello: string }>('k')).toEqual({ hello: 'world' });
  });

  it('reports size and clears', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.size()).toBe(2);
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it('deletes a single key without touching others', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.delete('a');
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
  });
});

describe('cache — TTL', () => {
  it('keeps the value before expiry', () => {
    vi.useFakeTimers();
    cache.set('k', 'v', { ttlSeconds: 60 });
    vi.advanceTimersByTime(30_000);
    expect(cache.get('k')).toBe('v');
  });

  it('drops the value after expiry and evicts from the store', () => {
    vi.useFakeTimers();
    cache.set('k', 'v', { ttlSeconds: 60 });
    vi.advanceTimersByTime(61_000);
    expect(cache.get('k')).toBeUndefined();
    expect(cache.size()).toBe(0);
  });

  it('treats missing ttl as no expiry', () => {
    vi.useFakeTimers();
    cache.set('k', 'v');
    vi.advanceTimersByTime(86_400_000);
    expect(cache.get('k')).toBe('v');
  });
});
