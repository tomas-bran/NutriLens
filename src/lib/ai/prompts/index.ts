/**
 * Prompt loader. Los prompts viven al lado de este archivo como `*.md` para
 * que sean reviewables en PRs sin escaping. Se inlinean en el bundle vía
 * `?raw` import (ver `next.config.mjs` webpack rule + `src/types/raw-imports.d.ts`).
 *
 * **Por qué `?raw` en vez de `readFileSync(__dirname, …)`**: webpack reescribe
 * `__dirname` al directorio del bundle compilado (`.next/server/app/api/<route>/`),
 * y los `.md` no se copian ahí — bug KI-01 documentado en `docs/known-issues.md`.
 * Con `?raw` el contenido queda inlineado en el bundle como string literal,
 * funciona idéntico en `next dev`, `next build` y `output: 'standalone'`, sin
 * file tracing.
 *
 * Versionado: cada archivo lleva la versión en el nombre (`extract_product-v1.md`).
 * Cuando un prompt cambia semánticamente, bumpear a `v2` — la versión vieja
 * se conserva para que `pipelineTrace.details.promptVersion` siga siendo
 * legible en runs históricos.
 *
 * See `docs/specs/E02-analisis-multimodal-ia.md §2.2 + §5.1` y `E05 §6`.
 */
import EXTRACT_PRODUCT_V1 from './extract_product-v1.md?raw';
import EXTRACT_PRODUCT_V1_CORRECTIVE from './extract_product-v1-corrective.md?raw';
import DETECT_LABEL_KIND_V1 from './detect_label_kind-v1.md?raw';
import EXPLAIN_PRODUCT_V1 from './explain_product-v1.md?raw';
import CHAT_PARSE_INTENT_V1 from './chat_parse_intent-v1.md?raw';
import CHAT_PARSE_INTENT_V2 from './chat_parse_intent-v2.md?raw';
import CHAT_SUGGESTIONS_V1 from './chat_suggestions-v1.md?raw';
import CHAT_ANSWER_V1 from './chat_answer-v1.md?raw';
import CHAT_ANSWER_V2 from './chat_answer-v2.md?raw';
import CHAT_ANSWER_V3 from './chat_answer-v3.md?raw';
import CHAT_SMALLTALK_V1 from './chat_smalltalk-v1.md?raw';
import CHAT_SMALLTALK_V2 from './chat_smalltalk-v2.md?raw';
import CHAT_TITLE_V1 from './chat_title-v1.md?raw';

export type PromptVersion =
  | 'extract_product-v1'
  | 'extract_product-v1-corrective'
  | 'detect_label_kind-v1'
  | 'explain_product-v1'
  | 'chat_parse_intent-v1'
  | 'chat_parse_intent-v2'
  | 'chat_suggestions-v1'
  | 'chat_answer-v1'
  | 'chat_answer-v2'
  | 'chat_answer-v3'
  | 'chat_smalltalk-v1'
  | 'chat_smalltalk-v2'
  | 'chat_title-v1';

const PROMPTS: Record<PromptVersion, string> = {
  'extract_product-v1': EXTRACT_PRODUCT_V1,
  'extract_product-v1-corrective': EXTRACT_PRODUCT_V1_CORRECTIVE,
  'detect_label_kind-v1': DETECT_LABEL_KIND_V1,
  'explain_product-v1': EXPLAIN_PRODUCT_V1,
  'chat_parse_intent-v1': CHAT_PARSE_INTENT_V1,
  'chat_parse_intent-v2': CHAT_PARSE_INTENT_V2,
  'chat_suggestions-v1': CHAT_SUGGESTIONS_V1,
  'chat_answer-v1': CHAT_ANSWER_V1,
  'chat_answer-v2': CHAT_ANSWER_V2,
  'chat_answer-v3': CHAT_ANSWER_V3,
  'chat_smalltalk-v1': CHAT_SMALLTALK_V1,
  'chat_smalltalk-v2': CHAT_SMALLTALK_V2,
  'chat_title-v1': CHAT_TITLE_V1,
};

export function loadPrompt(version: PromptVersion): string {
  return PROMPTS[version];
}

export function renderPrompt(version: PromptVersion, vars: Record<string, string> = {}): string {
  const template = PROMPTS[version];
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}
