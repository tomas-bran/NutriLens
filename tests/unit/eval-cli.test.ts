import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkProviderIsReal, loadManifest, parseCli, validateArgs } from '../../evals/runner/cli';

describe('parseCli', () => {
  it('returns sensible defaults for an empty argv', () => {
    expect(parseCli([])).toEqual({
      prompt: undefined,
      filter: undefined,
      id: undefined,
      compare: undefined,
      cacheOnly: false,
      noCache: false,
    });
  });

  it('parses --prompt, --filter, --id verbatim', () => {
    const a = parseCli([
      '--prompt',
      'extract_product-v1',
      '--filter',
      'category=galletitas',
      '--id',
      '001',
    ]);
    expect(a).toMatchObject({
      prompt: 'extract_product-v1',
      filter: 'category=galletitas',
      id: '001',
    });
  });

  it('joins multiple --compare values with a comma', () => {
    const a = parseCli(['--compare', 'v1', '--compare', 'v2']);
    expect(a.compare).toBe('v1,v2');
  });

  it('handles --cache-only and --no-cache flags', () => {
    expect(parseCli(['--cache-only']).cacheOnly).toBe(true);
    expect(parseCli(['--no-cache']).noCache).toBe(true);
  });

  it('returns compare=undefined when the flag was never passed', () => {
    expect(parseCli(['--prompt', 'x']).compare).toBeUndefined();
  });
});

describe('validateArgs', () => {
  it('passes when --prompt is set', () => {
    expect(validateArgs(parseCli(['--prompt', 'x']))).toEqual({ ok: true });
  });

  it('passes when --compare is set', () => {
    expect(validateArgs(parseCli(['--compare', 'a', '--compare', 'b']))).toEqual({ ok: true });
  });

  it('fails when neither --prompt nor --compare is set', () => {
    const r = validateArgs(parseCli([]));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toMatch(/Missing --prompt or --compare/);
    }
  });
});

describe('checkProviderIsReal', () => {
  it('returns ok=true when IA_PROVIDER=foundry', () => {
    expect(checkProviderIsReal({ IA_PROVIDER: 'foundry' })).toEqual({
      ok: true,
      provider: 'foundry',
    });
  });

  it('returns ok=true when IA_PROVIDER=azure-openai', () => {
    expect(checkProviderIsReal({ IA_PROVIDER: 'azure-openai' })).toMatchObject({
      ok: true,
      provider: 'azure-openai',
    });
  });

  it('returns ok=false when IA_PROVIDER is unset (defaults to mock)', () => {
    const r = checkProviderIsReal({});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/IA_PROVIDER=mock/);
  });

  it('returns ok=false when IA_PROVIDER is explicitly mock', () => {
    expect(checkProviderIsReal({ IA_PROVIDER: 'mock' }).ok).toBe(false);
  });
});

describe('loadManifest', () => {
  let workdir: string;

  beforeEach(() => {
    workdir = mkdtempSync(join(tmpdir(), 'eval-cli-'));
    mkdirSync(join(workdir, 'evals', 'dataset'), { recursive: true });
  });

  afterEach(() => {
    rmSync(workdir, { recursive: true, force: true });
  });

  function writeManifest(content: string) {
    writeFileSync(join(workdir, 'evals', 'dataset', 'manifest.json'), content);
  }

  it('loads a valid manifest', () => {
    writeManifest(JSON.stringify({ version: 1, cases: [{ id: '001' }, { id: '002' }] }));
    const r = loadManifest(workdir);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.manifest.cases).toHaveLength(2);
  });

  it('accepts an empty cases array', () => {
    writeManifest(JSON.stringify({ version: 1, cases: [] }));
    const r = loadManifest(workdir);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.manifest.cases).toHaveLength(0);
  });

  it('returns ok=false when the file does not exist', () => {
    const r = loadManifest(workdir);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/Cannot read/);
  });

  it('returns ok=false on invalid JSON', () => {
    writeManifest('{not valid');
    const r = loadManifest(workdir);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/Invalid JSON/);
  });

  it('returns ok=false when the root is not an object', () => {
    writeManifest('[]');
    const r = loadManifest(workdir);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/not an object/);
  });

  it('rejects unsupported manifest versions', () => {
    writeManifest(JSON.stringify({ version: 2, cases: [] }));
    const r = loadManifest(workdir);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/Unsupported manifest version/);
  });

  it('rejects when cases is not an array', () => {
    writeManifest(JSON.stringify({ version: 1, cases: { not: 'an array' } }));
    const r = loadManifest(workdir);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/must be an array/);
  });
});
