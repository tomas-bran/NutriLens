/**
 * Unit tests for `recordUserAnalysis` ("Analizados por vos").
 * Prisma + logger are mocked: we assert the composite-key upsert shape and the
 * fail-open contract (a DB error must never propagate).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const upsert = vi.fn();
const warn = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: { productAnalysis: { upsert: (...args: unknown[]) => upsert(...args) } },
}));
vi.mock('@/lib/logger', () => ({
  logger: { warn: (...args: unknown[]) => warn(...args), info: vi.fn(), error: vi.fn() },
}));

import { recordUserAnalysis } from '@/lib/products/record-analysis';

describe('recordUserAnalysis', () => {
  beforeEach(() => {
    upsert.mockReset().mockResolvedValue({});
    warn.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('upserts by the composite (userId, productId) key — idempotent, no overwrite', async () => {
    await recordUserAnalysis('user-1', 'prod-1');
    expect(upsert).toHaveBeenCalledWith({
      where: { userId_productId: { userId: 'user-1', productId: 'prod-1' } },
      create: { userId: 'user-1', productId: 'prod-1' },
      update: {},
    });
  });

  it('is fail-open: a DB error is swallowed and logged, never thrown', async () => {
    upsert.mockRejectedValueOnce(new Error('db down'));
    await expect(recordUserAnalysis('user-1', 'prod-1')).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      'product_analysis.link_failed',
      expect.objectContaining({ userId: 'user-1', productId: 'prod-1' }),
    );
  });
});
