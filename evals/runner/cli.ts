/**
 * Pure helpers extracted from run-eval.ts so they can be unit-tested without
 * triggering process.exit. The entry point at run-eval.ts wraps these with
 * the actual exit codes + logging.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

export type CliArgs = {
  prompt?: string;
  filter?: string;
  id?: string;
  /** Raw value of --compare. parseArgs(multiple:true) returns an array; we join with comma. */
  compare?: string;
  cacheOnly: boolean;
  noCache: boolean;
};

export type ProviderCheckResult = { ok: true; provider: string } | { ok: false; message: string };

export type ManifestLoadResult<TCase = unknown> =
  | { ok: true; manifest: { version: 1; cases: TCase[] } }
  | { ok: false; message: string };

/** Parse process.argv-style args into a typed CliArgs object. Pure. */
export function parseCli(argv: readonly string[]): CliArgs {
  const { values } = parseArgs({
    args: [...argv],
    options: {
      prompt: { type: 'string' },
      filter: { type: 'string' },
      id: { type: 'string' },
      compare: { type: 'string', multiple: true },
      'cache-only': { type: 'boolean', default: false },
      'no-cache': { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });
  return {
    prompt: values.prompt,
    filter: values.filter,
    id: values.id,
    compare: Array.isArray(values.compare) ? values.compare.join(',') : undefined,
    cacheOnly: Boolean(values['cache-only']),
    noCache: Boolean(values['no-cache']),
  };
}

/**
 * The eval runner needs a real provider — mock would always return the same
 * fixed answer, defeating the point of measuring quality.
 *
 * Returns a discriminated result instead of throwing so the CLI wrapper owns
 * the exit code.
 */
export function checkProviderIsReal(
  env: Record<string, string | undefined> = process.env,
): ProviderCheckResult {
  const provider = env.IA_PROVIDER ?? 'mock';
  if (provider === 'mock') {
    return {
      ok: false,
      message: [
        '✗ IA_PROVIDER=mock — the eval runner needs a real provider.',
        '  Set IA_PROVIDER=foundry (or azure-openai) and the corresponding',
        '  endpoint/key in .env.local before running the eval.',
        '',
        '  See docs/specs/E07-evaluation-strategy.md §7.',
      ].join('\n'),
    };
  }
  return { ok: true, provider };
}

/**
 * Load + parse evals/dataset/manifest.json. Accepts an explicit `cwd` so
 * tests can point at a fixture directory without touching process.cwd().
 */
export function loadManifest(cwd: string = process.cwd()): ManifestLoadResult {
  const path = resolve(cwd, 'evals/dataset/manifest.json');
  let raw: string;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch (err) {
    return { ok: false, message: `Cannot read ${path}: ${(err as Error).message}` };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { ok: false, message: `Invalid JSON in ${path}: ${(err as Error).message}` };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, message: `Manifest is not an object: ${path}` };
  }
  const m = parsed as { version?: unknown; cases?: unknown };
  if (m.version !== 1) {
    return { ok: false, message: `Unsupported manifest version: ${String(m.version)}` };
  }
  if (!Array.isArray(m.cases)) {
    return { ok: false, message: `Manifest.cases must be an array` };
  }
  return { ok: true, manifest: { version: 1, cases: m.cases } };
}

/**
 * Validates the combination of CLI args. Used by the entry point to decide
 * whether to bail out early (exit 2) with the usage message.
 */
export function validateArgs(args: CliArgs): { ok: true } | { ok: false; message: string } {
  if (!args.prompt && !args.compare) {
    return {
      ok: false,
      message: [
        'Missing --prompt or --compare flag.',
        '  Examples:',
        '    npm run eval -- --prompt extract_product-v1',
        '    npm run eval -- --prompt extract_product-v1 --filter category=galletitas',
        '    npm run eval -- --compare extract_product-v1 extract_product-v2',
      ].join('\n'),
    };
  }
  return { ok: true };
}
