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
  SavedProductLite,
} from './types';

const DEFAULT_TIMEOUT_MS = 25_000;
const BACKOFF_MS = 2_000;

export class FoundryProvider implements IaProvider {
  private readonly client: OpenAI;
  private readonly multimodalModel: string;
  // private readonly miniModel: string; // wired in US-17 (generate_explanation)

  constructor(deps?: { client?: OpenAI }) {
    this.multimodalModel = required('AZURE_AI_FOUNDRY_MODEL_MULTIMODAL');
    // this.miniModel = required('AZURE_AI_FOUNDRY_MODEL_MINI');
    this.client =
      deps?.client ??
      new OpenAI({
        baseURL: required('AZURE_AI_FOUNDRY_ENDPOINT'),
        apiKey: required('AZURE_AI_FOUNDRY_KEY'),
      });
  }

  async analyzeLabel(file: Buffer, mime: string, opts: AnalyzeOpts): Promise<IaCallResult> {
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
            {
              type: 'text',
              text: 'Extraé la información de esta etiqueta y devolvé SOLO el JSON pedido.',
            },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      timeoutMs,
    });
  }

  async classifyLabelKind(_file: Buffer, _mime: string, _opts: AnalyzeOpts): Promise<IaCallResult> {
    throw new Error('classifyLabelKind not implemented in FoundryProvider yet (US-05)');
  }

  async generateExplanation(
    _product: ProductExtraction,
    _opts: ExplainOpts,
  ): Promise<IaCallResult> {
    throw new Error('generateExplanation not implemented in FoundryProvider yet (US-17)');
  }

  async answerWithContext(
    _question: string,
    _products: SavedProductLite[],
    _opts: AnswerOpts,
  ): Promise<IaCallResult> {
    throw new Error('answerWithContext not implemented in FoundryProvider yet (US-29)');
  }

  /**
   * Sends one chat.completions request with timeout + 1 backoff retry on 429/5xx.
   * Surfaces a mapped ApiError on terminal failure.
   */
  private async callChat(params: {
    model: string;
    messages: OpenAI.Chat.ChatCompletionMessageParam[];
    timeoutMs: number;
  }): Promise<IaCallResult> {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      const start = Date.now();
      try {
        const r = await this.client.chat.completions.create(
          {
            model: params.model,
            max_tokens: 1500,
            temperature: 0.1,
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
