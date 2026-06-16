/**
 * Tests del título de conversación generado por IA (NL-302 rediseño).
 * Cubre: transcript builder, sanitización de la salida del modelo, y el
 * flujo con IA + fallback al heurístico cuando la IA falla o devuelve vacío.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  buildTranscript,
  sanitizeTitle,
  generateConversationTitle,
  TITLE_PROMPT_VERSION,
} from '@/lib/conversations/generate-title';
import type { StoredMessage } from '@/lib/conversations/types';
import type { IaProvider, IaCallResult } from '@/lib/ai/types';

function mkIa(over: Partial<IaProvider> = {}): IaProvider {
  const notImpl = () => Promise.reject(new Error('not implemented'));
  return {
    analyzeLabel: notImpl,
    classifyLabelKind: notImpl,
    generateExplanation: notImpl,
    parseIntent: notImpl,
    answerWithContext: notImpl,
    ...over,
  } as IaProvider;
}

const ok = (raw: string): IaCallResult => ({ raw, usage: { in: 1, out: 1 }, latencyMs: 1 });

const convo: StoredMessage[] = [
  { role: 'user', text: '¿Qué galletitas sin gluten tengo?' },
  { role: 'assistant', text: 'Tenés 2 productos sin gluten en tu historial.' },
];

describe('buildTranscript', () => {
  it('formatea como "Usuario:/NutriLens:" y colapsa espacios', () => {
    const t = buildTranscript([
      { role: 'user', text: '  hola   mundo ' },
      { role: 'assistant', text: 'respuesta' },
    ]);
    expect(t).toBe('Usuario: hola mundo\nNutriLens: respuesta');
  });

  it('limita a las primeras 6 intervenciones', () => {
    const many: StoredMessage[] = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      text: `m${i}`,
    }));
    const lines = buildTranscript(many).split('\n');
    expect(lines).toHaveLength(6);
  });

  it('devuelve string vacío si no hay mensajes', () => {
    expect(buildTranscript([])).toBe('');
  });
});

describe('sanitizeTitle', () => {
  it('quita comillas envolventes y punto final', () => {
    expect(sanitizeTitle('"Galletitas sin gluten."')).toBe('Galletitas sin gluten');
  });

  it('quita el prefijo "Título:"', () => {
    expect(sanitizeTitle('Título: Comparación de yogures')).toBe('Comparación de yogures');
  });

  it('se queda con la primera línea', () => {
    expect(sanitizeTitle('Snacks aptos veganos\nExplicación extra')).toBe('Snacks aptos veganos');
  });

  it('trunca en límite de palabra cuando excede 60 chars', () => {
    const long = 'Productos sin gluten ni lactosa aptos para celíacos y veganos con bajo riesgo';
    const r = sanitizeTitle(long);
    expect(r.length).toBeLessThanOrEqual(63);
    expect(r.endsWith('…')).toBe(true);
  });
});

describe('generateConversationTitle', () => {
  it('usa la salida sanitizada de la IA con el prompt de título', async () => {
    const answerWithContext = vi.fn().mockResolvedValue(ok('  "Galletitas sin gluten" '));
    const ia = mkIa({ answerWithContext });

    const title = await generateConversationTitle(convo, { ia });

    expect(title).toBe('Galletitas sin gluten');
    expect(answerWithContext).toHaveBeenCalledOnce();
    const call = answerWithContext.mock.calls.at(0);
    expect(call?.[0]).toContain('Usuario: ¿Qué galletitas sin gluten tengo?');
    expect(call?.[1]).toEqual([]);
    expect(call?.[2]?.promptVersion).toBe(TITLE_PROMPT_VERSION);
  });

  it('cae al heurístico si la IA lanza error', async () => {
    const ia = mkIa({ answerWithContext: vi.fn().mockRejectedValue(new Error('boom')) });
    const title = await generateConversationTitle(convo, { ia });
    expect(title).toBe('¿Qué galletitas sin gluten tengo?');
  });

  it('cae al heurístico si la IA devuelve vacío', async () => {
    const ia = mkIa({ answerWithContext: vi.fn().mockResolvedValue(ok('   ')) });
    const title = await generateConversationTitle(convo, { ia });
    expect(title).toBe('¿Qué galletitas sin gluten tengo?');
  });

  it('sin mensajes de usuario usa "Nueva conversación"', async () => {
    const ia = mkIa({ answerWithContext: vi.fn().mockResolvedValue(ok('')) });
    const onlyAssistant: StoredMessage[] = [{ role: 'assistant', text: 'hola' }];
    const title = await generateConversationTitle(onlyAssistant, { ia });
    expect(title).toBe('Nueva conversación');
  });
});
