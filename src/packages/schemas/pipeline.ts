/**
 * Pipeline trace schemas.
 * See `docs/specs/E06-pipeline-observable-y-ux.md §2`.
 */
import { z } from 'zod';

export const StepNameSchema = z.enum([
  'validate_file',
  'detect_label_kind',
  'extract_with_ia',
  'validate_schema',
  'enrich_with_off',
  'apply_rules',
  'compute_risk',
  'generate_explanation',
  'persist',
]);

export type StepName = z.infer<typeof StepNameSchema>;

export const StepStatusSchema = z.enum(['ok', 'skipped', 'error']);
export type StepStatus = z.infer<typeof StepStatusSchema>;

export const StepTraceSchema = z.object({
  name: StepNameSchema,
  status: StepStatusSchema,
  startedAt: z.string().datetime(),
  durationMs: z.number().int().min(0),
  details: z.record(z.unknown()).optional(),
});

export type StepTrace = z.infer<typeof StepTraceSchema>;

export const PipelineTraceSchema = z.array(StepTraceSchema);
export type PipelineTrace = z.infer<typeof PipelineTraceSchema>;
