import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '@/lib/logger';

const stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

beforeEach(() => {
  stdoutWrite.mockClear();
  stderrWrite.mockClear();
  delete process.env.LOG_LEVEL;
});

afterEach(() => {
  delete process.env.LOG_LEVEL;
});

function lastLine(spy: typeof stdoutWrite | typeof stderrWrite): Record<string, unknown> {
  const calls = spy.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  const raw = calls[calls.length - 1]?.[0];
  if (typeof raw !== 'string') throw new Error('logger emitted non-string');
  return JSON.parse(raw.trim()) as Record<string, unknown>;
}

describe('logger — JSON line shape (00-overview §8)', () => {
  it('emits info with ts/level/event/requestId on stdout', () => {
    logger.info('upload.received', { requestId: 'req-1', sizeBytes: 1234 });
    const line = lastLine(stdoutWrite);
    expect(line).toMatchObject({
      level: 'info',
      event: 'upload.received',
      requestId: 'req-1',
      sizeBytes: 1234,
    });
    expect(typeof line.ts).toBe('string');
    expect(new Date(line.ts as string).getTime()).not.toBeNaN();
  });

  it('routes warn to stderr', () => {
    logger.warn('api.error', { requestId: 'req-2', code: 'file_too_large' });
    expect(stdoutWrite).not.toHaveBeenCalled();
    expect(lastLine(stderrWrite)).toMatchObject({ level: 'warn', event: 'api.error' });
  });

  it('routes error to stderr', () => {
    logger.error('api.unhandled_error', { requestId: 'req-3' });
    expect(lastLine(stderrWrite)).toMatchObject({ level: 'error', event: 'api.unhandled_error' });
  });

  it('terminates each line with a single newline', () => {
    logger.info('x');
    const raw = stdoutWrite.mock.calls[0]?.[0];
    expect(raw).toMatch(/\n$/);
    expect((raw as string).match(/\n/g)?.length).toBe(1);
  });
});

describe('logger — level threshold (LOG_LEVEL env)', () => {
  it('drops debug when LOG_LEVEL=info (default)', () => {
    logger.debug('noisy');
    expect(stdoutWrite).not.toHaveBeenCalled();
  });

  it('emits debug when LOG_LEVEL=debug', () => {
    process.env.LOG_LEVEL = 'debug';
    logger.debug('verbose', { requestId: 'r' });
    expect(lastLine(stdoutWrite)).toMatchObject({ level: 'debug', event: 'verbose' });
  });

  it('drops info when LOG_LEVEL=warn', () => {
    process.env.LOG_LEVEL = 'warn';
    logger.info('quiet');
    expect(stdoutWrite).not.toHaveBeenCalled();
  });

  it('falls back to info threshold for unknown LOG_LEVEL values', () => {
    process.env.LOG_LEVEL = 'invalid';
    logger.info('still-emitted');
    expect(stdoutWrite).toHaveBeenCalledOnce();
  });
});
