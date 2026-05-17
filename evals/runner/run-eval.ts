/**
 * Eval runner — entry point for `npm run eval`.
 *
 * Thin CLI wrapper around the pure helpers in `cli.ts` so the testable logic
 * stays free of process.exit / console.* side effects. Real model wiring lands
 * with US-40 — see the TODO at the bottom.
 *
 * See `docs/specs/E07-evaluation-strategy.md`.
 */
import { checkProviderIsReal, loadManifest, parseCli, validateArgs } from './cli';

async function main(): Promise<void> {
  const args = parseCli(process.argv.slice(2));
  console.log('NutriLens — eval runner');
  console.log('  prompt:', args.prompt ?? '(none — use --prompt extract_product-v1)');
  if (args.filter) console.log('  filter:', args.filter);
  if (args.id) console.log('  id:', args.id);
  if (args.compare) console.log('  compare:', args.compare);
  if (args.cacheOnly) console.log('  cache-only: true');
  if (args.noCache) console.log('  no-cache: true');

  const check = validateArgs(args);
  if (!check.ok) {
    console.error('\n✗', check.message);
    process.exit(2);
  }

  if (!args.cacheOnly) {
    const providerCheck = checkProviderIsReal();
    if (!providerCheck.ok) {
      console.error(providerCheck.message);
      process.exit(2);
    }
  }

  const manifestResult = loadManifest();
  if (!manifestResult.ok) {
    console.error('\n✗', manifestResult.message);
    process.exit(1);
  }
  const manifest = manifestResult.manifest;
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
  //   - resolve prompt file (src/lib/ai/prompts/<prompt>.md)
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
