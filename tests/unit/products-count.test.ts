/**
 * Unit tests for the shared `getCatalogoCount` helper.
 * `React.cache` is a no-op outside a render context, so we can call the
 * exported value as a regular function with a stubbed prisma client.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const countMock = vi.fn();
vi.mock('@/lib/db', () => ({
  prisma: {
    product: {
      count: () => countMock(),
    },
  },
}));

import { getCatalogoCount } from '@/lib/products/count';

beforeEach(() => {
  countMock.mockReset();
});

describe('getCatalogoCount', () => {
  it('returns the count when Prisma resolves', async () => {
    countMock.mockResolvedValueOnce(42);
    expect(await getCatalogoCount()).toBe(42);
  });

  it('returns 0 when the DB call throws (graceful fallback)', async () => {
    countMock.mockRejectedValueOnce(new Error('Connection refused'));
    expect(await getCatalogoCount()).toBe(0);
  });

  it('returns 0 for non-Error rejections too', async () => {
    countMock.mockRejectedValueOnce('boom');
    expect(await getCatalogoCount()).toBe(0);
  });
});
