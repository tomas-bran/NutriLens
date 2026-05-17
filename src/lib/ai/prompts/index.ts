/**
 * Prompt loader. Prompts live alongside this file as `*.md` so they can be
 * reviewed in PRs without escaping. Loaded once per process at first access.
 *
 * Versioning: every prompt file name carries its version (`extract_product-v1.md`).
 * When you change the prompt semantically, bump to `v2` — the previous file
 * stays so old runs in `pipelineTrace.details.promptVersion` remain readable.
 *
 * See `docs/specs/E02-analisis-multimodal-ia.md §2.2 + §5.1`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type PromptVersion =
  | 'extract_product-v1'
  | 'extract_product-v1-corrective'
  | 'detect_label_kind-v1';

const PROMPT_FILES: Record<PromptVersion, string> = {
  'extract_product-v1': 'extract_product-v1.md',
  'extract_product-v1-corrective': 'extract_product-v1-corrective.md',
  'detect_label_kind-v1': 'detect_label_kind-v1.md',
};

const cache = new Map<PromptVersion, string>();

export function loadPrompt(version: PromptVersion): string {
  const cached = cache.get(version);
  if (cached) return cached;
  const file = PROMPT_FILES[version];
  const content = readFileSync(join(__dirname, file), 'utf-8');
  cache.set(version, content);
  return content;
}

export function renderPrompt(version: PromptVersion, vars: Record<string, string> = {}): string {
  const template = loadPrompt(version);
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}
