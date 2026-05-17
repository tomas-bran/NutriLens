import { describe, expect, it } from 'vitest';
import { renderMarkdownReport, reportFilename, type Report } from '../../evals/runner/reporter';

function baseReport(overrides: Partial<Report> = {}): Report {
  return {
    prompt: 'extract_product-v1',
    promptSha: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    model: 'Phi-4-multimodal-instruct',
    provider: 'foundry',
    timestamp: '2026-05-16T14:32:00.000Z',
    cases: [],
    aggregates: {},
    thresholdResults: [],
    aggregateScore: 0,
    ...overrides,
  };
}

describe('renderMarkdownReport — config header', () => {
  it('renders the prompt, model, provider, and shortened sha', () => {
    const md = renderMarkdownReport(baseReport());
    expect(md).toContain('# Eval Report — extract_product-v1 — 2026-05-16T14:32:00.000Z');
    expect(md).toContain('Provider: `foundry`');
    expect(md).toContain('Model: `Phi-4-multimodal-instruct`');
    expect(md).toContain('Prompt sha: `0123456789ab`'); // 12-char prefix only
  });
});

describe('renderMarkdownReport — summary line', () => {
  it('reports counts, cache hits and totals', () => {
    const md = renderMarkdownReport(
      baseReport({
        cases: [
          { id: '001', file: 'a.jpg', ok: true, tokensIn: 100, tokensOut: 50 },
          { id: '002', file: 'b.jpg', ok: true, cached: true },
          { id: '003', file: 'c.jpg', ok: false, error: 'parse error' },
        ],
        aggregateScore: 0.732,
      }),
    );
    expect(md).toContain('Cases evaluated: 3 (1 from cache, 1 failed)');
    expect(md).toContain('Total tokens: 100 in / 50 out');
    expect(md).toContain('Aggregate score: **0.732**');
  });

  it('treats undefined tokens as zero', () => {
    const md = renderMarkdownReport(
      baseReport({
        cases: [{ id: '001', file: 'a.jpg', ok: true }],
      }),
    );
    expect(md).toContain('Total tokens: 0 in / 0 out');
  });
});

describe('renderMarkdownReport — threshold status table', () => {
  it('renders one row per threshold with the right emoji', () => {
    const md = renderMarkdownReport(
      baseReport({
        thresholdResults: [
          {
            field: 'alergenos',
            metric: 'f1',
            value: 0.92,
            mvpThreshold: 0.8,
            demoThreshold: 0.9,
            status: 'demo',
          },
          {
            field: 'sellos',
            metric: 'f1',
            value: 0.84,
            mvpThreshold: 0.85,
            demoThreshold: 0.95,
            status: 'fail',
          },
          {
            field: 'producto',
            metric: 'fuzzy',
            value: 0.78,
            mvpThreshold: 0.7,
            demoThreshold: 0.85,
            status: 'mvp-only',
          },
        ],
      }),
    );
    expect(md).toContain('| alergenos | f1 | 0.920 | 0.8 | 0.9 | ✓ demo |');
    expect(md).toContain('| sellos | f1 | 0.840 | 0.85 | 0.95 | ✗ fail |');
    expect(md).toContain('| producto | fuzzy | 0.780 | 0.7 | 0.85 | ⚠ MVP only |');
  });
});

describe('renderMarkdownReport — failing cases section', () => {
  it('lists each failing case with id and file', () => {
    const md = renderMarkdownReport(
      baseReport({
        cases: [
          { id: '001', file: 'a.jpg', ok: true },
          {
            id: '007',
            file: 'yogur.jpg',
            ok: false,
            error: 'predicted categoria=bebidas, expected lácteos',
          },
          { id: '012', file: 'cereal.jpg', ok: false }, // no error message
        ],
      }),
    );
    expect(md).toContain('- [007] `yogur.jpg` — predicted categoria=bebidas, expected lácteos');
    expect(md).toContain('- [012] `cereal.jpg` — see details');
  });

  it('says _All cases passed._ when nothing failed', () => {
    const md = renderMarkdownReport(
      baseReport({ cases: [{ id: '001', file: 'a.jpg', ok: true }] }),
    );
    expect(md).toContain('_All cases passed._');
  });
});

describe('reportFilename', () => {
  it('produces UTC slug yyyy-mm-dd-hhhmi', () => {
    const date = new Date(Date.UTC(2026, 4, 16, 14, 32));
    expect(reportFilename('extract_product-v1', date)).toBe(
      'extract_product-v1-2026-05-16-14h32.md',
    );
  });

  it('pads single-digit months/days/hours/minutes with leading zero', () => {
    const date = new Date(Date.UTC(2026, 0, 5, 1, 7));
    expect(reportFilename('detect_label_kind-v1', date)).toBe(
      'detect_label_kind-v1-2026-01-05-01h07.md',
    );
  });

  it('defaults to "now" when no date is provided', () => {
    const filename = reportFilename('x');
    expect(filename).toMatch(/^x-\d{4}-\d{2}-\d{2}-\d{2}h\d{2}\.md$/);
  });
});
