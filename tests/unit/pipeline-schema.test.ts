import { describe, it, expect } from 'vitest';
import {
  StepNameSchema,
  StepStatusSchema,
  StepTraceSchema,
  PipelineTraceSchema,
} from '@schemas/pipeline';

describe('StepNameSchema', () => {
  const validNames = [
    'validate_file',
    'detect_label_kind',
    'extract_with_ia',
    'validate_schema',
    'apply_rules',
    'compute_risk',
    'generate_explanation',
    'persist',
  ];

  it.each(validNames)('accepts step name "%s"', (name) => {
    expect(StepNameSchema.safeParse(name).success).toBe(true);
  });

  it('rejects an unknown step name', () => {
    const r = StepNameSchema.safeParse('upload_file');
    expect(r.success).toBe(false);
  });

  it('rejects a non-string', () => {
    expect(StepNameSchema.safeParse(42).success).toBe(false);
  });
});

describe('StepStatusSchema', () => {
  it.each(['ok', 'skipped', 'error'])('accepts status "%s"', (status) => {
    expect(StepStatusSchema.safeParse(status).success).toBe(true);
  });

  it('rejects an unknown status', () => {
    expect(StepStatusSchema.safeParse('pending').success).toBe(false);
  });
});

describe('StepTraceSchema', () => {
  const baseValid = {
    name: 'validate_file' as const,
    status: 'ok' as const,
    startedAt: '2026-05-16T10:00:00.000Z',
    durationMs: 42,
  };

  it('accepts a minimal valid trace', () => {
    const r = StepTraceSchema.safeParse(baseValid);
    expect(r.success).toBe(true);
  });

  it('accepts a trace with details', () => {
    const r = StepTraceSchema.safeParse({
      ...baseValid,
      details: { bytes: 1024, mime: 'image/jpeg', flagged: true },
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.details).toEqual({ bytes: 1024, mime: 'image/jpeg', flagged: true });
    }
  });

  it('accepts durationMs of 0', () => {
    expect(StepTraceSchema.safeParse({ ...baseValid, durationMs: 0 }).success).toBe(true);
  });

  it('rejects a negative durationMs', () => {
    expect(StepTraceSchema.safeParse({ ...baseValid, durationMs: -1 }).success).toBe(false);
  });

  it('rejects a non-integer durationMs', () => {
    expect(StepTraceSchema.safeParse({ ...baseValid, durationMs: 12.5 }).success).toBe(false);
  });

  it('rejects a non-ISO startedAt', () => {
    expect(StepTraceSchema.safeParse({ ...baseValid, startedAt: '2026-05-16' }).success).toBe(
      false,
    );
  });

  it('rejects an unknown step name', () => {
    expect(StepTraceSchema.safeParse({ ...baseValid, name: 'upload_file' }).success).toBe(false);
  });

  it('rejects an unknown status', () => {
    expect(StepTraceSchema.safeParse({ ...baseValid, status: 'pending' }).success).toBe(false);
  });

  it('rejects when a required field is missing', () => {
    const { durationMs: _omitted, ...withoutDuration } = baseValid;
    expect(StepTraceSchema.safeParse(withoutDuration).success).toBe(false);
  });
});

describe('PipelineTraceSchema', () => {
  const step = (overrides: Partial<{ name: string; status: string; durationMs: number }> = {}) => ({
    name: 'validate_file',
    status: 'ok',
    startedAt: '2026-05-16T10:00:00.000Z',
    durationMs: 10,
    ...overrides,
  });

  it('accepts an empty pipeline trace', () => {
    expect(PipelineTraceSchema.safeParse([]).success).toBe(true);
  });

  it('accepts a full happy-path trace covering every step', () => {
    const trace = [
      step({ name: 'validate_file' }),
      step({ name: 'detect_label_kind' }),
      step({ name: 'extract_with_ia', status: 'ok', durationMs: 1200 }),
      step({ name: 'validate_schema' }),
      step({ name: 'apply_rules' }),
      step({ name: 'compute_risk' }),
      step({ name: 'generate_explanation', status: 'skipped' }),
      step({ name: 'persist' }),
    ];
    expect(PipelineTraceSchema.safeParse(trace).success).toBe(true);
  });

  it('rejects an array containing one invalid step', () => {
    const trace = [step(), step({ status: 'pending' })];
    expect(PipelineTraceSchema.safeParse(trace).success).toBe(false);
  });

  it('rejects a non-array value', () => {
    expect(PipelineTraceSchema.safeParse(step()).success).toBe(false);
  });
});
