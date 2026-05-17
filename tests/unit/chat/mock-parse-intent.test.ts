/**
 * Unit tests del parser heurístico del MockIaProvider (E05). El mock no llama
 * al LLM real — necesita devolver intents razonables para que los E2E y los
 * tests de integración cubran cada branch del pipeline.
 */
import { describe, it, expect } from 'vitest';
import { MockIaProvider, heuristicIntent } from '@/lib/ai/mock-provider';
import { ChatIntentSchema } from '@/lib/chat/intent-schema';

describe('heuristicIntent — detecta los disparadores del prompt v1', () => {
  it('"mostrame galletitas aptas para celíacos" → filter + galletitas + apto:celiaco', () => {
    const intent = heuristicIntent('mostrame galletitas aptas para celíacos');
    expect(intent.kind).toBe('filter');
    expect(intent.categoria).toBe('galletitas');
    expect(intent.apto).toBe('celiaco');
  });

  it('"qué productos tengo con leche" → info + keywords:["leche"]', () => {
    const intent = heuristicIntent('qué productos tengo con leche');
    expect(intent.kind).toBe('info');
    expect(intent.keywords).toEqual(['leche']);
  });

  it('"dame galletitas con mejor perfil nutricional" → filter + categoria + riesgo_max:"bajo"', () => {
    const intent = heuristicIntent('dame galletitas con mejor perfil nutricional');
    expect(intent.kind).toBe('filter');
    expect(intent.categoria).toBe('galletitas');
    expect(intent.riesgo_max).toBe('bajo');
  });

  it('"mostrame snacks veganos" → filter + snacks + apto:vegano', () => {
    const intent = heuristicIntent('mostrame snacks veganos');
    expect(intent.kind).toBe('filter');
    expect(intent.categoria).toBe('snacks');
    expect(intent.apto).toBe('vegano');
  });

  it('"qué tengo sin gluten" → info + apto:celiaco (sin gluten ≡ apto celíaco)', () => {
    const intent = heuristicIntent('qué tengo sin gluten');
    expect(intent.apto).toBe('celiaco');
    // sin_gluten no debe poblar alergeno_excluido (ya está mapeado al apto)
    expect(intent.alergeno_excluido).toBeNull();
  });

  it('"qué productos tengo sin maní" → info + alergeno_excluido:"maní"', () => {
    const intent = heuristicIntent('qué productos tengo sin maní');
    expect(intent.alergeno_excluido).toBe('maní');
  });

  it('"comparame Galletitas X con Galletitas Y" → compare + comparar:[X, Y]', () => {
    const intent = heuristicIntent('comparame Galletitas X con Galletitas Y');
    expect(intent.kind).toBe('compare');
    expect(intent.comparar).toEqual(['Galletitas X', 'Galletitas Y']);
  });

  it('"contame un chiste" → unknown', () => {
    const intent = heuristicIntent('contame un chiste');
    expect(intent.kind).toBe('unknown');
    expect(intent.categoria).toBeNull();
    expect(intent.apto).toBeNull();
  });

  it('"hola" → unknown (sin disparadores)', () => {
    const intent = heuristicIntent('hola');
    expect(intent.kind).toBe('unknown');
  });

  it('los intents producidos por el mock pasan ChatIntentSchema sin errores', () => {
    const qs = [
      'mostrame galletitas aptas para celíacos',
      'qué tengo con leche',
      'dame snacks veganos',
      'comparame A con B',
      'asdfghjkl',
    ];
    for (const q of qs) {
      const parsed = ChatIntentSchema.safeParse(heuristicIntent(q));
      expect(parsed.success, `intent inválido para "${q}"`).toBe(true);
    }
  });
});

describe('MockIaProvider.parseIntent — contrato IaProvider', () => {
  const provider = new MockIaProvider();
  const opts = { promptVersion: 'chat_parse_intent-v1' };

  it('devuelve un raw JSON parseable por ChatIntentSchema', async () => {
    const r = await provider.parseIntent('mostrame galletitas aptas para celíacos', opts);
    const parsed = ChatIntentSchema.safeParse(JSON.parse(r.raw));
    expect(parsed.success).toBe(true);
  });

  it('reporta zero token usage (mock)', async () => {
    const r = await provider.parseIntent('x', opts);
    expect(r.usage).toEqual({ in: 0, out: 0 });
  });

  it('reporta latencyMs no negativo', async () => {
    const r = await provider.parseIntent('x', opts);
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
