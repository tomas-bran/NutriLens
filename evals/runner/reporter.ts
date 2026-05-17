/**
 * Reporter — converts eval results into a markdown report file.
 *
 * Sprint 0 scaffolding: defines the report shape so US-40 can plug the
 * runner's output directly into `renderMarkdownReport()` and write the
 * result to `evals/results/<prompt>-<timestamp>.md`.
 *
 * See `docs/specs/E07-evaluation-strategy.md §10` for the report format.
 */
import type { PRF } from './metrics';

export type CaseResult = {
  id: string;
  file: string;
  ok: boolean;
  /** Free-form error message if `ok === false`. */
  error?: string;
  /** Per-field scores in [0, 1]. */
  scores?: Record<string, number>;
  /** Optional structured details for the report (e.g. set diffs). */
  details?: Record<string, unknown>;
  /** Tokens consumed (0 for cache hits). */
  tokensIn?: number;
  tokensOut?: number;
  /** Latency in ms (0 for cache hits). */
  latencyMs?: number;
  /** Whether the result came from .cache/ rather than the model. */
  cached?: boolean;
};

export type Report = {
  prompt: string;
  promptSha: string;
  model: string;
  provider: string;
  timestamp: string;
  /** All evaluated cases, including failures. */
  cases: CaseResult[];
  /** Per-field aggregated metrics (e.g. F1 for `alergenos`, exact for `riesgo`). */
  aggregates: Record<string, number | PRF>;
  /** Whether each MVP threshold passed. */
  thresholdResults: Array<{
    field: string;
    metric: 'exact' | 'fuzzy' | 'f1';
    value: number;
    mvpThreshold: number;
    demoThreshold: number;
    status: 'mvp-only' | 'demo' | 'fail';
  }>;
  /** Aggregate weighted score (0–1). */
  aggregateScore: number;
};

/**
 * Render a Report to markdown. Pure function — does no I/O. The runner
 * writes the returned string to `evals/results/<prompt>-<timestamp>.md`.
 */
export function renderMarkdownReport(r: Report): string {
  const total = r.cases.length;
  const failed = r.cases.filter((c) => !c.ok).length;
  const cached = r.cases.filter((c) => c.cached).length;
  const tokensIn = r.cases.reduce((a, b) => a + (b.tokensIn ?? 0), 0);
  const tokensOut = r.cases.reduce((a, b) => a + (b.tokensOut ?? 0), 0);

  const lines: string[] = [
    `# Eval Report — ${r.prompt} — ${r.timestamp}`,
    '',
    '## Config',
    `- Provider: \`${r.provider}\``,
    `- Model: \`${r.model}\``,
    `- Prompt version: \`${r.prompt}\``,
    `- Prompt sha: \`${r.promptSha.slice(0, 12)}\``,
    '',
    '## Summary',
    `- Cases evaluated: ${total} (${cached} from cache, ${failed} failed)`,
    `- Total tokens: ${tokensIn.toLocaleString()} in / ${tokensOut.toLocaleString()} out`,
    `- Aggregate score: **${r.aggregateScore.toFixed(3)}**`,
    '',
    '## Threshold status',
    '| Field | Metric | Value | MVP | Demo | Status |',
    '|-------|--------|------:|----:|-----:|:------|',
    ...r.thresholdResults.map((t) => {
      const emoji =
        t.status === 'demo' ? '✓ demo' : t.status === 'mvp-only' ? '⚠ MVP only' : '✗ fail';
      return `| ${t.field} | ${t.metric} | ${t.value.toFixed(3)} | ${t.mvpThreshold} | ${t.demoThreshold} | ${emoji} |`;
    }),
    '',
    '## Failing cases',
    ...(failed === 0
      ? ['_All cases passed._']
      : r.cases
          .filter((c) => !c.ok)
          .map((c) => `- [${c.id}] \`${c.file}\` — ${c.error ?? 'see details'}`)),
    '',
  ];
  return lines.join('\n');
}

/**
 * Returns the slug used for the report filename, e.g.
 * `extract_product-v1-2026-05-16-14h32.md`. Timezone-agnostic UTC.
 */
export function reportFilename(prompt: string, date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getUTCFullYear();
  const mm = pad(date.getUTCMonth() + 1);
  const dd = pad(date.getUTCDate());
  const hh = pad(date.getUTCHours());
  const mi = pad(date.getUTCMinutes());
  return `${prompt}-${yyyy}-${mm}-${dd}-${hh}h${mi}.md`;
}
