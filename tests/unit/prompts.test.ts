import { describe, expect, it } from 'vitest';
import { loadPrompt, renderPrompt } from '@/lib/ai/prompts';

describe('loadPrompt', () => {
  it('loads extract_product-v1 and includes the schema fields', () => {
    const prompt = loadPrompt('extract_product-v1');
    for (const field of [
      'producto',
      'categoria',
      'ingredientes_detectados',
      'alergenos',
      'sellos',
      'apto_vegano',
      'apto_celiaco',
      'apto_sin_lactosa',
      'riesgo',
      'confidence',
    ]) {
      expect(prompt).toContain(field);
    }
  });

  it('mentions the Argentine front-of-pack seals by exact name', () => {
    const prompt = loadPrompt('extract_product-v1');
    expect(prompt).toContain('exceso en azúcares');
    expect(prompt).toContain('exceso en sodio');
    expect(prompt).toContain('exceso en grasas saturadas');
  });

  it('loads extract_product-v1-corrective with the {{problems}} and {{previous}} placeholders', () => {
    const prompt = loadPrompt('extract_product-v1-corrective');
    expect(prompt).toContain('{{problems}}');
    expect(prompt).toContain('{{previous}}');
  });

  it('returns the cached instance on the second call (same identity)', () => {
    const a = loadPrompt('extract_product-v1');
    const b = loadPrompt('extract_product-v1');
    expect(a).toBe(b);
  });
});

describe('renderPrompt', () => {
  it('interpolates {{vars}} into the corrective prompt', () => {
    const rendered = renderPrompt('extract_product-v1-corrective', {
      problems: 'campo X faltante',
      previous: '{"bad":"json"}',
    });
    expect(rendered).toContain('campo X faltante');
    expect(rendered).toContain('{"bad":"json"}');
    expect(rendered).not.toContain('{{problems}}');
    expect(rendered).not.toContain('{{previous}}');
  });

  it('replaces missing vars with empty string', () => {
    const rendered = renderPrompt('extract_product-v1-corrective', { problems: 'p1' });
    expect(rendered).toContain('p1');
    expect(rendered).not.toContain('{{previous}}');
  });
});
