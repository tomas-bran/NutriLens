/**
 * @vitest-environment node
 *
 * Unit tests para `AzureOpenAIProvider`. Cubre:
 *   - Validación de env vars del constructor.
 *   - Fallback de `AZURE_OPENAI_MODEL_MINI` al multimodal cuando no se setea
 *     (caso "un solo modelo capaz, ej. gpt-5.1").
 *   - Que la lógica heredada de `OpenAICompatibleProvider` siga funcionando
 *     (analyze + parseIntent + answer con el cliente inyectado).
 *
 * No re-testeamos retry/timeout/mapProviderError acá: están cubiertos
 * exhaustivamente en `foundry-provider.test.ts` (mismo OpenAICompatibleProvider
 * base, mismo callChat).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { AzureOpenAIProvider } from '@/lib/ai/azure-openai-provider';

const ENV_BACKUP = { ...process.env };

beforeEach(() => {
  process.env.AZURE_OPENAI_ENDPOINT = 'https://stub.openai.azure.com/openai/v1';
  process.env.AZURE_OPENAI_KEY = 'stub-key';
  process.env.AZURE_OPENAI_MODEL_MULTIMODAL = 'gpt-5.1';
  process.env.AZURE_OPENAI_MODEL_MINI = 'gpt-5.1-mini';
});

afterEach(() => {
  process.env = { ...ENV_BACKUP };
});

function makeFakeClient(create: (...args: unknown[]) => unknown) {
  return { chat: { completions: { create } } } as never;
}

function okCompletion(content: string) {
  return {
    choices: [{ message: { content } }],
    usage: { prompt_tokens: 5, completion_tokens: 2 },
  };
}

describe('AzureOpenAIProvider — constructor env validation', () => {
  it('throws if AZURE_OPENAI_ENDPOINT is missing', () => {
    delete process.env.AZURE_OPENAI_ENDPOINT;
    expect(() => new AzureOpenAIProvider()).toThrow(/AZURE_OPENAI_ENDPOINT/);
  });

  it('throws if AZURE_OPENAI_KEY is missing', () => {
    delete process.env.AZURE_OPENAI_KEY;
    expect(() => new AzureOpenAIProvider()).toThrow(/AZURE_OPENAI_KEY/);
  });

  it('throws if AZURE_OPENAI_MODEL_MULTIMODAL is missing', () => {
    delete process.env.AZURE_OPENAI_MODEL_MULTIMODAL;
    expect(() => new AzureOpenAIProvider()).toThrow(/AZURE_OPENAI_MODEL_MULTIMODAL/);
  });

  it('does NOT throw when AZURE_OPENAI_MODEL_MINI is missing (falls back to multimodal)', () => {
    delete process.env.AZURE_OPENAI_MODEL_MINI;
    const create = vi.fn().mockResolvedValue(okCompletion('ok'));
    expect(() => new AzureOpenAIProvider({ client: makeFakeClient(create) })).not.toThrow();
  });
});

describe('AzureOpenAIProvider — model fallback (un solo modelo capaz)', () => {
  it('cuando AZURE_OPENAI_MODEL_MINI no está, las calls text-only usan el multimodal', async () => {
    delete process.env.AZURE_OPENAI_MODEL_MINI;
    const create = vi.fn().mockResolvedValue(okCompletion('{"kind":"unknown"}'));
    const provider = new AzureOpenAIProvider({ client: makeFakeClient(create) });

    await provider.parseIntent('hola', { promptVersion: 'chat_parse_intent-v1' });

    const [body] = create.mock.calls[0] as [Record<string, unknown>];
    // El text-only debería usar el modelo multimodal porque mini está vacío.
    expect(body.model).toBe('gpt-5.1');
  });

  it('cuando AZURE_OPENAI_MODEL_MINI sí está, lo usa para text-only', async () => {
    const create = vi.fn().mockResolvedValue(okCompletion('{"kind":"unknown"}'));
    const provider = new AzureOpenAIProvider({ client: makeFakeClient(create) });

    await provider.parseIntent('hola', { promptVersion: 'chat_parse_intent-v1' });

    const [body] = create.mock.calls[0] as [Record<string, unknown>];
    expect(body.model).toBe('gpt-5.1-mini');
  });

  it('analyze (multimodal) siempre usa el multimodal model', async () => {
    const create = vi.fn().mockResolvedValue(okCompletion('{"producto":"x"}'));
    const provider = new AzureOpenAIProvider({ client: makeFakeClient(create) });

    await provider.analyzeLabel(Buffer.from([0xff]), 'image/jpeg', {
      promptVersion: 'extract_product-v1',
    });

    const [body] = create.mock.calls[0] as [Record<string, unknown>];
    expect(body.model).toBe('gpt-5.1');
  });
});

describe('AzureOpenAIProvider — heredado de OpenAICompatibleProvider', () => {
  it('parseIntent strippea fences del raw output', async () => {
    const create = vi.fn().mockResolvedValue(okCompletion('```json\n{"kind":"unknown"}\n```'));
    const provider = new AzureOpenAIProvider({ client: makeFakeClient(create) });
    const r = await provider.parseIntent('x', { promptVersion: 'chat_parse_intent-v1' });
    expect(r.raw).toBe('{"kind":"unknown"}');
  });

  it('reporta tokens del modelo en usage', async () => {
    const create = vi.fn().mockResolvedValue({
      choices: [{ message: { content: 'ok' } }],
      usage: { prompt_tokens: 33, completion_tokens: 7 },
    });
    const provider = new AzureOpenAIProvider({ client: makeFakeClient(create) });
    const r = await provider.parseIntent('q', { promptVersion: 'chat_parse_intent-v1' });
    expect(r.usage).toEqual({ in: 33, out: 7 });
  });
});
