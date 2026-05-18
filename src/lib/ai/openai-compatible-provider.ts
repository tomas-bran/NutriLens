/**
 * OpenAICompatibleProvider — base concreta para cualquier endpoint
 * "OpenAI-compatible" (Azure AI Foundry, Azure OpenAI, OpenAI directo, …).
 *
 * Centraliza la lógica que tenían `FoundryProvider`/`AzureOpenAIProvider`
 * duplicadas:
 *   - retry+backoff en 429/5xx,
 *   - timeout configurable por método,
 *   - mapeo a `ApiError` (`model_timeout`, `model_rate_limited`, …),
 *   - render de prompts vía `renderPrompt()`,
 *   - `stripJsonFences()` sobre el output.
 *
 * Subclasses sólo proveen el `OpenAIProviderConfig` (endpoint, key, modelos);
 * la lógica de calls vive acá. Spec: docs/audit-2026-05.md §1.3 (PR-A).
 */
import type OpenAI from 'openai';
import { APIError, APIConnectionTimeoutError } from 'openai';
import { ApiError } from '@schemas/errors';
import { logger } from '@/lib/logger';
import type { ProductExtraction } from '@schemas/product';
import { stripJsonFences } from './strip-json-fences';
import { renderPrompt } from './prompts';
import type {
  AnalyzeOpts,
  AnswerOpts,
  ExplainOpts,
  IaCallResult,
  IaProvider,
  ParseIntentOpts,
  SavedProductLite,
} from './types';

export interface OpenAIProviderConfig {
  /** Display name (e.g. "foundry", "azure-openai") usado para logs. */
  name: string;
  /** Cliente OpenAI ya configurado. Inyectable para tests. */
  client: OpenAI;
  /** Modelo para calls multimodales (extract + classify). */
  multimodalModel: string;
  /** Modelo para calls text-only (explain + chat + intent). */
  miniModel: string;
}

const DEFAULT_TIMEOUT_MS = 25_000;
const BACKOFF_MS = 2_000;
const EXPLAIN_DEFAULT_TIMEOUT_MS = 10_000;

// E05 §4.3 / §6.3
const PARSE_INTENT_TIMEOUT_MS = 8_000;
const PARSE_INTENT_MAX_TOKENS = 200;
const PARSE_INTENT_TEMPERATURE = 0;
const ANSWER_TIMEOUT_MS = 10_000;
const ANSWER_MAX_TOKENS = 350;
const ANSWER_TEMPERATURE = 0.2;
const ANSWER_TOP_K = 5;

// Defaults (extract / classify / explain): mantienen el comportamiento de
// pre-refactor (temperature 0.1, max_tokens 1500).
const DEFAULT_TEMPERATURE = 0.1;
const DEFAULT_MAX_TOKENS = 1500;

export class OpenAICompatibleProvider implements IaProvider {
  protected readonly client: OpenAI;
  protected readonly multimodalModel: string;
  protected readonly miniModel: string;
  protected readonly name: string;

  constructor(config: OpenAIProviderConfig) {
    this.client = config.client;
    this.multimodalModel = config.multimodalModel;
    this.miniModel = config.miniModel;
    this.name = config.name;
  }

  async analyzeLabel(file: Buffer, mime: string, opts: AnalyzeOpts): Promise<IaCallResult> {
    return this.callMultimodal(
      file,
      mime,
      opts,
      'Extraé la información de esta etiqueta y devolvé SOLO el JSON pedido.',
    );
  }

  async classifyLabelKind(file: Buffer, mime: string, opts: AnalyzeOpts): Promise<IaCallResult> {
    return this.callMultimodal(
      file,
      mime,
      opts,
      'Clasificá la imagen y devolvé SOLO el JSON pedido.',
    );
  }

  private callMultimodal(
    file: Buffer,
    mime: string,
    opts: AnalyzeOpts,
    userInstruction: string,
  ): Promise<IaCallResult> {
    // eslint-disable-next-line testing-library/render-result-naming-convention -- false positive: renderPrompt is a prompt-template renderer, not @testing-library/react
    const systemPrompt = renderPrompt(opts.promptVersion as never, opts.extra ?? {});
    const dataUrl = `data:${mime};base64,${file.toString('base64')}`;
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    return this.callChat({
      model: this.multimodalModel,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userInstruction },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      timeoutMs,
    });
  }

  async generateExplanation(product: ProductExtraction, opts: ExplainOpts): Promise<IaCallResult> {
    // eslint-disable-next-line testing-library/render-result-naming-convention -- false positive: renderPrompt is a prompt-template renderer, not @testing-library/react
    const systemPrompt = renderPrompt(opts.promptVersion as never, {
      producto: product.producto,
      categoria: product.categoria,
      alergenos: product.alergenos.join(', ') || 'ninguno',
      sellos: product.sellos.join(', ') || 'ninguno',
      apto_vegano: String(product.apto_vegano),
      apto_celiaco: String(product.apto_celiaco),
      apto_sin_lactosa: String(product.apto_sin_lactosa),
      riesgo: product.riesgo,
      reglas_aplicadas: opts.extra?.reglas_aplicadas ?? '',
      confidence: product.confidence.toFixed(2),
    });
    return this.callChat({
      model: this.miniModel,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: 'Generá la explicación para este producto siguiendo las reglas de tono.',
        },
      ],
      timeoutMs: opts.timeoutMs ?? EXPLAIN_DEFAULT_TIMEOUT_MS,
    });
  }

  async parseIntent(question: string, opts: ParseIntentOpts): Promise<IaCallResult> {
    // eslint-disable-next-line testing-library/render-result-naming-convention -- false positive: renderPrompt is a prompt-template renderer, not @testing-library/react
    const systemPrompt = renderPrompt(opts.promptVersion as never, { question });
    return this.callChat({
      model: this.miniModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      timeoutMs: opts.timeoutMs ?? PARSE_INTENT_TIMEOUT_MS,
      temperature: PARSE_INTENT_TEMPERATURE,
      maxTokens: PARSE_INTENT_MAX_TOKENS,
    });
  }

  async answerWithContext(
    question: string,
    products: SavedProductLite[],
    opts: AnswerOpts,
  ): Promise<IaCallResult> {
    // eslint-disable-next-line testing-library/render-result-naming-convention -- false positive: renderPrompt is a prompt-template renderer, not @testing-library/react
    const systemPrompt = renderPrompt(opts.promptVersion as never, {
      question,
      products_json: JSON.stringify(products),
      top_k: String(ANSWER_TOP_K),
      ...(opts.extra ?? {}),
    });
    return this.callChat({
      model: this.miniModel,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: 'Respondé la pregunta usando solo los productos del contexto.',
        },
      ],
      timeoutMs: opts.timeoutMs ?? ANSWER_TIMEOUT_MS,
      temperature: ANSWER_TEMPERATURE,
      maxTokens: ANSWER_MAX_TOKENS,
    });
  }

  /** Single retry on 429/5xx; surfaces mapped `ApiError` on terminal failure. */
  protected async callChat(params: {
    model: string;
    messages: OpenAI.Chat.ChatCompletionMessageParam[];
    timeoutMs: number;
    temperature?: number;
    maxTokens?: number;
  }): Promise<IaCallResult> {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      const start = Date.now();
      try {
        const r = await this.client.chat.completions.create(
          {
            model: params.model,
            max_tokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
            temperature: params.temperature ?? DEFAULT_TEMPERATURE,
            messages: params.messages,
          },
          { timeout: params.timeoutMs },
        );
        const raw = r.choices[0]?.message?.content ?? '';
        const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
        return {
          raw: stripJsonFences(text),
          usage: {
            in: r.usage?.prompt_tokens ?? 0,
            out: r.usage?.completion_tokens ?? 0,
          },
          latencyMs: Date.now() - start,
        };
      } catch (err) {
        lastErr = err;
        if (attempt === 0 && shouldRetry(err)) {
          await sleep(BACKOFF_MS);
          continue;
        }
        throw mapProviderError(err);
      }
    }
    throw mapProviderError(lastErr);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(err: unknown): boolean {
  if (err instanceof APIError) {
    const status = err.status ?? 0;
    return status === 429 || status >= 500;
  }
  return false;
}

export function mapProviderError(err: unknown): ApiError {
  if (err instanceof APIConnectionTimeoutError) {
    return new ApiError('model_timeout', 'El modelo no respondió a tiempo. Intentá de nuevo.', 504);
  }
  if (err instanceof APIError) {
    const status = err.status ?? 500;
    // Loguear el cuerpo del error (no PII — viene del proveedor) facilita
    // diagnosticar 400 por param incompatible, deployment-name inválido,
    // api-version, etc. El handler upstream ya redacta el message para el
    // usuario.
    logger.warn('ia.provider_error', {
      status,
      type: err.type,
      code: err.code,
      message: err.message,
    });
    if (status === 429) {
      return new ApiError(
        'model_rate_limited',
        'El servicio de IA está saturado. Probá en unos segundos.',
        429,
      );
    }
    if (status === 408 || status === 504) {
      return new ApiError(
        'model_timeout',
        'El modelo no respondió a tiempo. Intentá de nuevo.',
        504,
      );
    }
    return new ApiError(
      'model_error',
      'El proveedor de IA devolvió un error. Probá de nuevo más tarde.',
      502,
      { providerStatus: status },
    );
  }
  return new ApiError('model_error', 'Error inesperado al llamar al modelo.', 502, {
    message: err instanceof Error ? err.message : 'unknown',
  });
}
