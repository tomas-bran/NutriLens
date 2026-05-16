import type { StepName, StepStatus, StepTrace } from '@schemas/pipeline';

export function makeTrace(
  name: StepName,
  status: StepStatus,
  startedAt: Date,
  details?: Record<string, unknown>,
): StepTrace {
  return {
    name,
    status,
    startedAt: startedAt.toISOString(),
    durationMs: Math.max(0, Date.now() - startedAt.getTime()),
    ...(details ? { details } : {}),
  };
}
