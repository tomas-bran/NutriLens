/**
 * Eval runner — entry point for `npm run eval`.
 *
 * Sprint 0 scaffolding: parses CLI flags, loads the manifest, ensures the
 * IaProvider is real (not mock), but does NOT yet run cases against the model.
 * The full implementation is US-40 (epic E07). When that story lands, replace
 * the TODO blocks with real wiring:
 *
 *   1. Iterate `manifest.cases` (with --filter / --id support).
 *   2. Call the IaProvider for each case (with .cache/ memoization).
 *   3. Compute metrics from `runner/metrics.ts`.
 *   4. Render the report with `runner/reporter.ts`.
 *   5. Exit non-zero if any MVP threshold fails.
 *
 * See `docs/specs/E07-evaluation-strategy.md`.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

type CliArgs = {
  prompt?: string;
  filter?: string;
  id?: string;
  compare?: string;
  cacheOnly: boolean;
  noCache: boolean;
};

function parseCli(): CliArgs {
  const { values } = parseArgs({
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

function assertProviderIsReal() {
  const provider = process.env.IA_PROVIDER ?? 'mock';
  if (provider === 'mock') {
    console.error(
      [
        '✗ IA_PROVIDER=mock — the eval runner needs a real provider.',
        '  Set IA_PROVIDER=foundry (or azure-openai) and the corresponding',
        '  endpoint/key in .env.local before running the eval.',
        '',
        '  See docs/specs/E07-evaluation-strategy.md §7.',
      ].join('\n'),
    );
    process.exit(2);
  }
}

function loadManifest() {
  const path = resolve(process.cwd(), 'evals/dataset/manifest.json');
  const raw = readFileSync(path, 'utf-8');
  const parsed = JSON.parse(raw) as { version: number; cases: unknown[] };
  if (parsed.version !== 1) {
    throw new Error(`Unsupported manifest version: ${parsed.version}`);
  }
  return parsed;
}

async function main() {
  const args = parseCli();
  console.log('NutriLens — eval runner');
  console.log('  prompt:', args.prompt ?? '(none — use --prompt extract_product-v1)');
  if (args.filter) console.log('  filter:', args.filter);
  if (args.id) console.log('  id:', args.id);
  if (args.compare) console.log('  compare:', args.compare);
  if (args.cacheOnly) console.log('  cache-only: true');
  if (args.noCache) console.log('  no-cache: true');

  if (!args.prompt && !args.compare) {
    console.error('\n✗ Missing --prompt or --compare flag.');
    console.error('  Examples:');
    console.error('    npm run eval -- --prompt extract_product-v1');
    console.error('    npm run eval -- --prompt extract_product-v1 --filter category=galletitas');
    console.error('    npm run eval -- --compare extract_product-v1 extract_product-v2');
    process.exit(2);
  }

  if (!args.cacheOnly) {
    assertProviderIsReal();
  }

  const manifest = loadManifest();
  console.log(`\nLoaded manifest with ${manifest.cases.length} case(s).`);

  if (manifest.cases.length === 0) {
    console.warn(
      [
        '\n⚠ Dataset is empty. Nothing to evaluate yet.',
        '  Populate evals/dataset/manifest.json before running.',
        '  Coverage matrix lives in docs/specs/E07-evaluation-strategy.md §2.2.',
      ].join('\n'),
    );
    process.exit(0);
  }

  // TODO(US-40):
  //   - resolve prompt file (lib/ai/prompts/<prompt>.md)
  //   - filter cases by --filter / --id
  //   - for each case:
  //       const cacheKey = sha256(promptText + caseFileBytes + model)
  //       if cache hit and !noCache → use cached response
  //       else if cacheOnly → fail this case as "uncached"
  //       else → call IaProvider, store response in .cache/
  //   - parse model output, compute per-case metrics (see runner/metrics.ts)
  //   - aggregate, render markdown report via runner/reporter.ts
  //   - exit 1 if any MVP threshold fails
  console.error('\n✗ Runner not implemented yet — see US-40 (E07).');
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
