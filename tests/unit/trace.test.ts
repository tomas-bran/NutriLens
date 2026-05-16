import { describe, it, expect } from 'vitest';
import { makeTrace } from '@/lib/pipeline/trace';

describe('makeTrace', () => {
  it('builds a StepTrace with ISO startedAt and computed duration', () => {
    const t0 = new Date(Date.now() - 50);
    const trace = makeTrace('validate_file', 'ok', t0, { mime: 'image/jpeg' });
    expect(trace).toMatchObject({ name: 'validate_file', status: 'ok' });
    expect(trace.startedAt).toBe(t0.toISOString());
    expect(trace.durationMs).toBeGreaterThanOrEqual(0);
    expect(trace.details).toEqual({ mime: 'image/jpeg' });
  });

  it('omits the details key when not provided (keeps the JSON compact)', () => {
    const trace = makeTrace('persist', 'skipped', new Date());
    expect(trace).not.toHaveProperty('details');
  });

  it('clamps a non-monotonic clock skew to durationMs >= 0', () => {
    const future = new Date(Date.now() + 60_000);
    const trace = makeTrace('persist', 'ok', future);
    expect(trace.durationMs).toBe(0);
  });
});
