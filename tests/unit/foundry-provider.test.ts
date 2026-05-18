/**
 * @vitest-environment node
 *
 * Unit tests for FoundryProvider. We inject a fake OpenAI client (`deps.client`)
 * so the SDK never hits the network — what we exercise is the timeout option,
 * the 1-retry-on-429/5xx logic, and the error mapping to ApiError codes.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { APIConnectionTimeoutError, APIError } from 'openai';
import { ApiError } from '@schemas/errors';
import { FoundryProvider, mapProviderError } from '@/lib/ai/foundry-provider';

const ENV_BACKUP = { ...process.env };

beforeEach(() => {
  process.env.AZURE_AI_FOUNDRY_ENDPOINT = 'https://stub.local/openai/v1';
  process.env.AZURE_AI_FOUNDRY_KEY = 'stub-key';
  process.env.AZURE_AI_FOUNDRY_MODEL_MULTIMODAL = 'Phi-4-multimodal-instruct';
  process.env.AZURE_AI_FOUNDRY_MODEL_MINI = 'Phi-4-mini-instruct';
});

afterEach(() => {
  process.env = { ...ENV_BACKUP };
  vi.useRealTimers();
});

function makeFakeClient(create: (...args: unknown[]) => unknown) {
  return { chat: { completions: { create } } } as never;
}

function okCompletion(content: string) {
  return {
    choices: [{ message: { content } }],
    usage: { prompt_tokens: 12, completion_tokens: 7 },
  };
}

const FILE = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const OPTS = { promptVersion: 'extract_product-v1' as const };

describe('FoundryProvider — constructor env validation', () => {
  it('throws if AZURE_AI_FOUNDRY_ENDPOINT is missing', () => {
    delete process.env.AZURE_AI_FOUNDRY_ENDPOINT;
    expect(() => new FoundryProvider()).toThrow(/AZURE_AI_FOUNDRY_ENDPOINT/);
  });
});

describe('FoundryProvider.analyzeLabel — happy path', () => {
  it('passes model, temperature 0.1, max_tokens 1500, and timeout to the SDK', async () => {
    const create = vi.fn().mockResolvedValue(okCompletion('{"producto":"x"}'));
    const provider = new FoundryProvider({ client: makeFakeClient(create) });

    const result = await provider.analyzeLabel(FILE, 'image/jpeg', { ...OPTS, timeoutMs: 25_000 });

    expect(create).toHaveBeenCalledOnce();
    const [body, reqOpts] = create.mock.calls[0] as [Record<string, unknown>, { timeout: number }];
    expect(body).toMatchObject({
      model: 'Phi-4-multimodal-instruct',
      temperature: 0.1,
      max_tokens: 1500,
    });
    expect(reqOpts.timeout).toBe(25_000);
    expect(result.raw).toBe('{"producto":"x"}');
    expect(result.usage).toEqual({ in: 12, out: 7 });
  });

  it('strips markdown fences from the raw output', async () => {
    const create = vi.fn().mockResolvedValue(okCompletion('```json\n{"producto":"fenced"}\n```'));
    const provider = new FoundryProvider({ client: makeFakeClient(create) });
    const r = await provider.analyzeLabel(FILE, 'image/jpeg', OPTS);
    expect(r.raw).toBe('{"producto":"fenced"}');
  });

  it('embeds the file as a data: URL with the right mime', async () => {
    const create = vi.fn().mockResolvedValue(okCompletion('{}'));
    const provider = new FoundryProvider({ client: makeFakeClient(create) });
    await provider.analyzeLabel(FILE, 'application/pdf', OPTS);
    const [body] = create.mock.calls[0] as [Record<string, unknown>];
    const messages = body.messages as Array<{ content: unknown }>;
    const userContent = messages[1]?.content as Array<{
      type: string;
      image_url?: { url: string };
    }>;
    const imagePart = userContent.find((p) => p.type === 'image_url');
    expect(imagePart?.image_url?.url).toMatch(/^data:application\/pdf;base64,/);
  });

  it('defaults to a 25s timeout when AnalyzeOpts.timeoutMs is omitted', async () => {
    const create = vi.fn().mockResolvedValue(okCompletion('{}'));
    const provider = new FoundryProvider({ client: makeFakeClient(create) });
    await provider.analyzeLabel(FILE, 'image/jpeg', OPTS);
    const reqOpts = (create.mock.calls[0] as unknown[])[1] as { timeout: number };
    expect(reqOpts.timeout).toBe(25_000);
  });
});

describe('FoundryProvider.generateExplanation (US-18)', () => {
  const PRODUCT = {
    producto: 'Galletitas Test',
    categoria: 'galletitas' as const,
    ingredientes_detectados: ['harina de trigo'],
    alergenos: ['gluten' as const],
    sellos: ['exceso en azúcares' as const],
    apto_vegano: false,
    apto_celiaco: false,
    apto_sin_lactosa: true,
    riesgo: 'medio' as const,
    confidence: 0.88,
  };

  it('uses the Phi-4-mini text-only model (NOT multimodal) per spec §5.1', async () => {
    const create = vi
      .fn()
      .mockResolvedValue(
        okCompletion('Producto con gluten. Recordá que NutriLens es un asistente informativo.'),
      );
    const provider = new FoundryProvider({ client: makeFakeClient(create) });
    await provider.generateExplanation(PRODUCT, { promptVersion: 'explain_product-v1' });
    const [body] = create.mock.calls[0] as [Record<string, unknown>];
    expect(body.model).toBe('Phi-4-mini-instruct');
  });

  it('renders the prompt with product fields + reglas_aplicadas from opts.extra', async () => {
    const create = vi.fn().mockResolvedValue(okCompletion('ok'));
    const provider = new FoundryProvider({ client: makeFakeClient(create) });
    await provider.generateExplanation(PRODUCT, {
      promptVersion: 'explain_product-v1',
      extra: { reglas_aplicadas: 'contiene_gluten' },
    });
    const [body] = create.mock.calls[0] as [Record<string, unknown>];
    const messages = body.messages as Array<{ role: string; content: unknown }>;
    const systemContent = String(messages[0]?.content);
    expect(systemContent).toContain('Galletitas Test');
    expect(systemContent).toContain('galletitas');
    expect(systemContent).toContain('contiene_gluten');
    expect(systemContent).toContain('exceso en azúcares');
  });

  it('defaults to a 10s timeout for the explanation call (cheaper than extract 25s)', async () => {
    const create = vi.fn().mockResolvedValue(okCompletion('ok'));
    const provider = new FoundryProvider({ client: makeFakeClient(create) });
    await provider.generateExplanation(PRODUCT, { promptVersion: 'explain_product-v1' });
    const reqOpts = (create.mock.calls[0] as unknown[])[1] as { timeout: number };
    expect(reqOpts.timeout).toBe(10_000);
  });

  it('sends "ninguno" when alergenos/sellos arrays are empty (prompt placeholder safety)', async () => {
    const create = vi.fn().mockResolvedValue(okCompletion('ok'));
    const provider = new FoundryProvider({ client: makeFakeClient(create) });
    await provider.generateExplanation(
      { ...PRODUCT, alergenos: [], sellos: [] },
      { promptVersion: 'explain_product-v1' },
    );
    const [body] = create.mock.calls[0] as [Record<string, unknown>];
    const systemContent = String((body.messages as Array<{ content: unknown }>)[0]?.content);
    expect(systemContent).toMatch(/Alérgenos detectados: ninguno/);
    expect(systemContent).toMatch(/Sellos: ninguno/);
  });
});

describe('FoundryProvider.classifyLabelKind (US-05)', () => {
  it('sends the detect_label_kind-v1 system prompt + image to the multimodal model', async () => {
    const create = vi
      .fn()
      .mockResolvedValue(okCompletion('{"is_food_label":true,"confidence":0.95}'));
    const provider = new FoundryProvider({ client: makeFakeClient(create) });

    const r = await provider.classifyLabelKind(FILE, 'image/png', {
      promptVersion: 'detect_label_kind-v1',
    });

    expect(create).toHaveBeenCalledOnce();
    const [body] = create.mock.calls[0] as [Record<string, unknown>];
    expect(body).toMatchObject({
      model: 'Phi-4-multimodal-instruct',
      temperature: 0.1,
      max_tokens: 1500,
    });
    const messages = body.messages as Array<{ role: string; content: unknown }>;
    expect(messages[0]?.role).toBe('system');
    expect(messages[0]?.content).toMatch(/is_food_label/);
    expect(messages[0]?.content).toMatch(/Eres un clasificador/);
    const userContent = messages[1]?.content as Array<{ type: string }>;
    expect(userContent.some((p) => p.type === 'image_url')).toBe(true);
    expect(r.raw).toBe('{"is_food_label":true,"confidence":0.95}');
  });

  it('surfaces 429 from the classifier path → model_rate_limited after one retry', async () => {
    vi.useFakeTimers();
    const create = vi
      .fn()
      .mockRejectedValue(new APIError(429, undefined as never, 'rl', undefined));
    const provider = new FoundryProvider({ client: makeFakeClient(create) });
    const promise = provider
      .classifyLabelKind(FILE, 'image/jpeg', { promptVersion: 'detect_label_kind-v1' })
      .catch((e) => e);
    await vi.advanceTimersByTimeAsync(2000);
    const err = await promise;
    expect(create).toHaveBeenCalledTimes(2);
    expect(err.code).toBe('model_rate_limited');
  });
});

describe('FoundryProvider.analyzeLabel — retry on 429/5xx (one attempt only)', () => {
  it('retries once on 429 then succeeds', async () => {
    vi.useFakeTimers();
    const rateLimited = new APIError(429, undefined as never, 'rate limited', undefined);
    const create = vi
      .fn()
      .mockRejectedValueOnce(rateLimited)
      .mockResolvedValueOnce(okCompletion('{"ok":true}'));
    const provider = new FoundryProvider({ client: makeFakeClient(create) });

    const promise = provider.analyzeLabel(FILE, 'image/jpeg', OPTS);
    await vi.advanceTimersByTimeAsync(2000);
    const r = await promise;

    expect(create).toHaveBeenCalledTimes(2);
    expect(r.raw).toBe('{"ok":true}');
  });

  it('retries once on 503 then surfaces model_error after the second failure', async () => {
    vi.useFakeTimers();
    const down = new APIError(503, undefined as never, 'service unavailable', undefined);
    const create = vi.fn().mockRejectedValue(down);
    const provider = new FoundryProvider({ client: makeFakeClient(create) });

    const promise = provider.analyzeLabel(FILE, 'image/jpeg', OPTS).catch((e) => e);
    await vi.advanceTimersByTimeAsync(2000);
    const err = await promise;

    expect(create).toHaveBeenCalledTimes(2);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('model_error');
    expect(err.httpStatus).toBe(502);
  });

  it('does NOT retry on 400-class errors other than 429', async () => {
    const bad = new APIError(400, undefined as never, 'bad request', undefined);
    const create = vi.fn().mockRejectedValue(bad);
    const provider = new FoundryProvider({ client: makeFakeClient(create) });

    await expect(provider.analyzeLabel(FILE, 'image/jpeg', OPTS)).rejects.toMatchObject({
      code: 'model_error',
    });
    expect(create).toHaveBeenCalledOnce();
  });
});

describe('FoundryProvider.parseIntent (US-28 / E05 §4.3)', () => {
  it('usa Phi-4-mini con temperature=0, max_tokens=200 y timeout=8s por default', async () => {
    const create = vi.fn().mockResolvedValue(
      okCompletion(
        JSON.stringify({
          kind: 'filter',
          categoria: 'galletitas',
          riesgo_max: null,
          apto: 'celiaco',
          alergeno_excluido: null,
          keywords: [],
          comparar: [],
        }),
      ),
    );
    const provider = new FoundryProvider({ client: makeFakeClient(create) });

    const r = await provider.parseIntent('mostrame galletitas aptas para celíacos', {
      promptVersion: 'chat_parse_intent-v1',
    });

    expect(create).toHaveBeenCalledOnce();
    const [body, reqOpts] = create.mock.calls[0] as [Record<string, unknown>, { timeout: number }];
    expect(body).toMatchObject({
      model: 'Phi-4-mini-instruct',
      temperature: 0,
      max_tokens: 200,
    });
    expect(reqOpts.timeout).toBe(8_000);
    expect(JSON.parse(r.raw).kind).toBe('filter');
  });

  it('embebe la pregunta en el system prompt vía {{question}}', async () => {
    const create = vi.fn().mockResolvedValue(okCompletion('{"kind":"unknown"}'));
    const provider = new FoundryProvider({ client: makeFakeClient(create) });
    await provider.parseIntent('contame un chiste', { promptVersion: 'chat_parse_intent-v1' });
    const [body] = create.mock.calls[0] as [Record<string, unknown>];
    const messages = body.messages as Array<{ role: string; content: unknown }>;
    expect(String(messages[0]?.content)).toContain('contame un chiste');
  });

  it('strips json fences del raw output del modelo', async () => {
    const create = vi.fn().mockResolvedValue(okCompletion('```json\n{"kind":"unknown"}\n```'));
    const provider = new FoundryProvider({ client: makeFakeClient(create) });
    const r = await provider.parseIntent('x', { promptVersion: 'chat_parse_intent-v1' });
    expect(r.raw).toBe('{"kind":"unknown"}');
  });

  it('respeta timeoutMs custom de los opts', async () => {
    const create = vi.fn().mockResolvedValue(okCompletion('{"kind":"unknown"}'));
    const provider = new FoundryProvider({ client: makeFakeClient(create) });
    await provider.parseIntent('x', { promptVersion: 'chat_parse_intent-v1', timeoutMs: 3_000 });
    const reqOpts = (create.mock.calls[0] as unknown[])[1] as { timeout: number };
    expect(reqOpts.timeout).toBe(3_000);
  });
});

describe('FoundryProvider.answerWithContext (US-29 / E05 §6.3)', () => {
  const SAMPLE_PRODUCTS = [
    {
      id: 'p1',
      nombre: 'Galletitas A',
      categoria: 'galletitas',
      riesgo: 'bajo',
      alergenos: [],
      sellos: [],
    },
    {
      id: 'p2',
      nombre: 'Galletitas B',
      categoria: 'galletitas',
      riesgo: 'medio',
      alergenos: ['leche'],
      sellos: ['exceso en azúcares'],
    },
  ];

  it('usa Phi-4-mini con temperature=0.2, max_tokens=350 y timeout=10s por default', async () => {
    const create = vi.fn().mockResolvedValue(okCompletion('Tenés 2 galletitas.'));
    const provider = new FoundryProvider({ client: makeFakeClient(create) });

    await provider.answerWithContext('mostrame galletitas', SAMPLE_PRODUCTS, {
      promptVersion: 'chat_answer-v1',
    });

    const [body, reqOpts] = create.mock.calls[0] as [Record<string, unknown>, { timeout: number }];
    expect(body).toMatchObject({
      model: 'Phi-4-mini-instruct',
      temperature: 0.2,
      max_tokens: 350,
    });
    expect(reqOpts.timeout).toBe(10_000);
  });

  it('interpola question, products_json y top_k en el system prompt', async () => {
    const create = vi.fn().mockResolvedValue(okCompletion('ok'));
    const provider = new FoundryProvider({ client: makeFakeClient(create) });
    await provider.answerWithContext('mostrame galletitas', SAMPLE_PRODUCTS, {
      promptVersion: 'chat_answer-v1',
    });
    const [body] = create.mock.calls[0] as [Record<string, unknown>];
    const systemContent = String((body.messages as Array<{ content: unknown }>)[0]?.content);
    expect(systemContent).toContain('mostrame galletitas');
    expect(systemContent).toContain('Galletitas A');
    expect(systemContent).toContain('Galletitas B');
    expect(systemContent).toContain('top 5');
  });

  it('respeta timeoutMs custom de los opts', async () => {
    const create = vi.fn().mockResolvedValue(okCompletion('ok'));
    const provider = new FoundryProvider({ client: makeFakeClient(create) });
    await provider.answerWithContext('q', [], {
      promptVersion: 'chat_answer-v1',
      timeoutMs: 4_500,
    });
    const reqOpts = (create.mock.calls[0] as unknown[])[1] as { timeout: number };
    expect(reqOpts.timeout).toBe(4_500);
  });

  it('reporta tokens del modelo en usage', async () => {
    const create = vi.fn().mockResolvedValue(okCompletion('Tenés 2 galletitas.'));
    const provider = new FoundryProvider({ client: makeFakeClient(create) });
    const r = await provider.answerWithContext('q', [], { promptVersion: 'chat_answer-v1' });
    expect(r.usage).toEqual({ in: 12, out: 7 });
  });
});

describe('mapProviderError — error code mapping (spec E02 §7)', () => {
  it('maps APIConnectionTimeoutError → model_timeout 504', () => {
    const e = mapProviderError(new APIConnectionTimeoutError({ message: 'timeout' }));
    expect(e).toMatchObject({ code: 'model_timeout', httpStatus: 504 });
  });

  it('maps APIError 429 → model_rate_limited 429', () => {
    const e = mapProviderError(new APIError(429, undefined as never, 'rl', undefined));
    expect(e).toMatchObject({ code: 'model_rate_limited', httpStatus: 429 });
  });

  it('maps APIError 408 → model_timeout 504', () => {
    const e = mapProviderError(new APIError(408, undefined as never, 'timeout', undefined));
    expect(e).toMatchObject({ code: 'model_timeout', httpStatus: 504 });
  });

  it('maps APIError 504 → model_timeout 504', () => {
    const e = mapProviderError(new APIError(504, undefined as never, 'gateway timeout', undefined));
    expect(e).toMatchObject({ code: 'model_timeout', httpStatus: 504 });
  });

  it.each([500, 502, 503])('maps APIError %i → model_error 502', (status) => {
    const e = mapProviderError(new APIError(status, undefined as never, 'down', undefined));
    expect(e).toMatchObject({ code: 'model_error', httpStatus: 502 });
    expect(e.details).toMatchObject({ providerStatus: status });
  });

  it('maps a bare Error → model_error 502 with the message in details', () => {
    const e = mapProviderError(new Error('network ECONNRESET'));
    expect(e).toMatchObject({ code: 'model_error', httpStatus: 502 });
    expect(e.details).toMatchObject({ message: 'network ECONNRESET' });
  });

  it('maps a non-Error thrown value (string) → model_error 502 without crashing', () => {
    const e = mapProviderError('boom');
    expect(e).toMatchObject({ code: 'model_error', httpStatus: 502 });
    expect(e.details).toMatchObject({ message: 'unknown' });
  });
});
