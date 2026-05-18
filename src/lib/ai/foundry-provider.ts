/**
 * FoundryProvider — IaProvider backed by the `openai` SDK pointing at the
 * Azure AI Foundry OpenAI-compatible endpoint (`/openai/v1`). One HTTP client
 * serves every model in the resource; the model name is passed per request.
 *
 * Implements the resilience rules from spec E02 §4.1 + §7:
 *   - 25 s default timeout (overridable via AnalyzeOpts.timeoutMs).
 *   - One retry with 2 s backoff on 429 / 5xx; after that we surface the
 *     mapped ApiError (`model_rate_limited`, `model_error`).
 *   - 408 / network timeouts surface as `model_timeout` (504).
 *   - Raw text passes through `stripJsonFences` before being handed to the
 *     caller, since Phi can wrap the JSON in markdown fences.
 *
 * Mocked in unit tests by spying on `chatClient.chat.completions.create` —
 * we never hit the network from the test suite.
 */
import OpenAI, { APIError, APIConnectionTimeoutError } from 'openai';
import { ApiError } from '@schemas/errors';
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

// Defaults heredados (extract / classify / explain): mantienen el comportamiento
// previo al refactor de US-29 (temperature 0.1, max_tokens 1500).
const DEFAULT_TEMPERATURE = 0.1;
const DEFAULT_MAX_TOKENS = 1500;

export class FoundryProvider implements IaProvider {
  private readonly client: OpenAI;
  private readonly multimodalModel: string;
  private readonly miniModel: string;

  constructor(deps?: { client?: OpenAI }) {
    this.multimodalModel = required('AZURE_AI_FOUNDRY_MODEL_MULTIMODAL');
    this.miniModel = required('AZURE_AI_FOUNDRY_MODEL_MINI');
    this.client =
      deps?.client ??
      new OpenAI({
        baseURL: required('AZURE_AI_FOUNDRY_ENDPOINT'),
        apiKey: required('AZURE_AI_FOUNDRY_KEY'),
      });
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

  /** Common path for both multimodal calls — only the user instruction text differs. */
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
      // reglas_aplicadas viene calculado por apply_rules — el step lo pasa
      // como override en opts.extra cuando lo tiene.
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
      // US-31 / `chat_answer-v2` lo lee para disparar el formato tabla cuando
      // el intent es `compare`. Para v1 queda como `''` y se ignora.
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

  /**
   * Sends one chat.completions request with timeout + 1 backoff retry on 429/5xx.
   * Surfaces a mapped ApiError on terminal failure.
   */
  private async callChat(params: {
    model: string;
    messages: OpenAI.Chat.ChatCompletionMessageParam[];
    timeoutMs: number;
    /** Opcional: defaults a 0.1 (extract/classify/explain). El chat lo sobreescribe. */
    temperature?: number;
    /** Opcional: defaults a 1500 (extract/classify/explain). El chat lo recorta. */
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
    // Unreachable — the loop either returns or throws.
    throw mapProviderError(lastErr);
  }
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env var ${name} for FoundryProvider`);
  }
  return v;
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
