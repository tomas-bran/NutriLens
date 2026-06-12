/**
 * Tests de generate_suggestions (NL-503 — pills contextuales).
 * El contrato clave es el fail-open: ante cualquier salida rara del LLM
 * devolvemos null y la UI cae al set estático.
 */
import { describe, expect, it, vi } from 'vitest';
import type { IaProvider } from '@/lib/ai/types';
import { SUGGESTIONS_PROMPT_VERSION, generateSuggestions } from '@/lib/chat/generate-suggestions';

function makeIa(raw: string | Error) {
  const answerWithContext = vi.fn().mockImplementation(() => {
    if (raw instanceof Error) return Promise.reject(raw);
    return Promise.resolve({ raw, usage: { in: 10, out: 5 }, latencyMs: 3 });
  });
  return { ia: { answerWithContext } as unknown as IaProvider, answerWithContext };
}

describe('generateSuggestions', () => {
  it('parsea el array JSON y lo devuelve limpio', async () => {
    const { ia, answerWithContext } = makeIa(
      '["¿Cuál tiene menos sodio?", "Compará los dos", "Ver alérgenos"]',
    );
    const result = await generateSuggestions('pregunta', 'respuesta', [], { ia });

    expect(result).toEqual(['¿Cuál tiene menos sodio?', 'Compará los dos', 'Ver alérgenos']);
    const [, , opts] = answerWithContext.mock.calls[0] as [
      unknown,
      unknown,
      { promptVersion: string },
    ];
    expect(opts.promptVersion).toBe(SUGGESTIONS_PROMPT_VERSION);
  });

  it('tolera fences de markdown alrededor del JSON', async () => {
    const { ia } = makeIa('```json\n["Una sugerencia", "Otra más"]\n```');
    expect(await generateSuggestions('q', 'a', [], { ia })).toEqual(['Una sugerencia', 'Otra más']);
  });

  it('excluye la pregunta que el usuario acaba de hacer y recorta a 4', async () => {
    const { ia } = makeIa('["misma pregunta", "s1", "s2", "s3", "s4", "s5"]');
    const result = await generateSuggestions('Misma Pregunta', 'a', [], { ia });
    expect(result).toEqual(['s1', 's2', 's3', 's4']);
  });

  it('filtra entradas no-string, vacías o demasiado largas', async () => {
    const { ia } = makeIa(
      JSON.stringify(['ok corta', 42, '', '   ', 'x'.repeat(60), 'también ok']),
    );
    expect(await generateSuggestions('q', 'a', [], { ia })).toEqual(['ok corta', 'también ok']);
  });

  it('devuelve null si quedan menos de 2 sugerencias útiles', async () => {
    const { ia } = makeIa('["solo una"]');
    expect(await generateSuggestions('q', 'a', [], { ia })).toBeNull();
  });

  it('devuelve null con JSON malformado', async () => {
    const { ia } = makeIa('acá no hay JSON');
    expect(await generateSuggestions('q', 'a', [], { ia })).toBeNull();
  });

  it('devuelve null si el JSON no es un array', async () => {
    const { ia } = makeIa('{"sugerencias": ["a", "b"]}');
    expect(await generateSuggestions('q', 'a', [], { ia })).toBeNull();
  });

  it('devuelve null si el provider tira (timeout, 429, etc.) — nunca propaga', async () => {
    const { ia } = makeIa(new Error('model_timeout'));
    await expect(generateSuggestions('q', 'a', [], { ia })).resolves.toBeNull();
  });
});
