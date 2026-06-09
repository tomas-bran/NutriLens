/**
 * apply_rules — 18 cases (>15 required by US-16 + spec §8) covering every
 * blacklist + the edge cases from spec §10.
 */
import { describe, expect, it } from 'vitest';
import { apply_rules } from '@/lib/rules/apply';
import type { ProductExtraction } from '@schemas/product';

function makeProduct(overrides: Partial<ProductExtraction> = {}): ProductExtraction {
  return {
    producto: 'Test',
    categoria: 'otros',
    ingredientes_detectados: [],
    alergenos: [],
    sellos: [],
    apto_vegano: true,
    apto_celiaco: true,
    apto_sin_lactosa: true,
    riesgo: 'bajo',
    confidence: 0.9,
    ...overrides,
  };
}

describe('apply_rules — NO_CELIAC blacklist (US-16 Escenario 1)', () => {
  it('flags "harina de trigo" → not apto_celiaco', () => {
    const r = apply_rules(makeProduct({ ingredientes_detectados: ['harina de trigo'] }));
    expect(r.apto_celiaco).toBe(false);
    expect(r.reglas_aplicadas).toContain('contiene_gluten');
  });

  it('flags "Cebada" (case-insensitive)', () => {
    const r = apply_rules(makeProduct({ ingredientes_detectados: ['Cebada'] }));
    expect(r.apto_celiaco).toBe(false);
  });

  it('flags "centeno"', () => {
    expect(
      apply_rules(makeProduct({ ingredientes_detectados: ['centeno molido'] })).apto_celiaco,
    ).toBe(false);
  });

  it('flags "sémola" (with diacritic)', () => {
    expect(apply_rules(makeProduct({ ingredientes_detectados: ['sémola'] })).apto_celiaco).toBe(
      false,
    );
  });

  it('flags when "gluten" is in the alergenos array', () => {
    const r = apply_rules(makeProduct({ alergenos: ['gluten'] }));
    expect(r.apto_celiaco).toBe(false);
    expect(r.reglas_aplicadas).toContain('contiene_gluten');
  });

  it('flags "almidón de trigo" (matches "almidon de trigo" after normalize)', () => {
    expect(
      apply_rules(makeProduct({ ingredientes_detectados: ['almidón de trigo'] })).apto_celiaco,
    ).toBe(false);
  });
});

describe('apply_rules — NO_LACTOSE blacklist (US-16 Escenario 2)', () => {
  it('flags plain "leche"', () => {
    const r = apply_rules(makeProduct({ ingredientes_detectados: ['leche'] }));
    expect(r.apto_sin_lactosa).toBe(false);
    expect(r.reglas_aplicadas).toContain('contiene_lacteos');
  });

  it('flags "leche en polvo"', () => {
    expect(
      apply_rules(makeProduct({ ingredientes_detectados: ['leche en polvo'] })).apto_sin_lactosa,
    ).toBe(false);
  });

  it('flags "suero de leche"', () => {
    expect(
      apply_rules(makeProduct({ ingredientes_detectados: ['suero de leche'] })).apto_sin_lactosa,
    ).toBe(false);
  });

  it('flags "Caseína" (case + accent insensitive)', () => {
    expect(
      apply_rules(makeProduct({ ingredientes_detectados: ['Caseína'] })).apto_sin_lactosa,
    ).toBe(false);
  });

  it('flags "manteca" via NO_LACTOSE', () => {
    expect(
      apply_rules(makeProduct({ ingredientes_detectados: ['manteca'] })).apto_sin_lactosa,
    ).toBe(false);
  });

  it('flags when "leche" is in the alergenos array', () => {
    const r = apply_rules(makeProduct({ alergenos: ['leche'] }));
    expect(r.apto_sin_lactosa).toBe(false);
  });
});

describe('apply_rules — NO_VEGAN blacklist (US-16 Escenario 3)', () => {
  it('flags "huevo" via alergenos array', () => {
    const r = apply_rules(makeProduct({ alergenos: ['huevo'] }));
    expect(r.apto_vegano).toBe(false);
    expect(r.reglas_aplicadas).toContain('contiene_origen_animal');
  });

  it('flags "carne"', () => {
    expect(apply_rules(makeProduct({ ingredientes_detectados: ['carne'] })).apto_vegano).toBe(
      false,
    );
  });

  it('flags "gelatina"', () => {
    expect(apply_rules(makeProduct({ ingredientes_detectados: ['gelatina'] })).apto_vegano).toBe(
      false,
    );
  });

  it('flags "miel"', () => {
    expect(apply_rules(makeProduct({ ingredientes_detectados: ['miel'] })).apto_vegano).toBe(false);
  });

  it('flags "carmín" (animal colorant)', () => {
    expect(apply_rules(makeProduct({ ingredientes_detectados: ['carmín'] })).apto_vegano).toBe(
      false,
    );
  });

  it('flags "atún" via NO_VEGAN', () => {
    expect(apply_rules(makeProduct({ ingredientes_detectados: ['atún'] })).apto_vegano).toBe(false);
  });
});

describe('apply_rules — LLM downgrade (regresion bug Don Yeyo)', () => {
  // El LLM puede detectar non-apto desde el nombre del producto o la foto
  // sin que el ingrediente aparezca en la lista (ej. "Ravioles de carne y
  // espinaca" → apto_vegano=false con ingredientes_detectados=[]). Antes
  // las reglas pisaban ese `false` con un `true` defensivo, dejando un
  // falso positivo de seguridad. Ahora ambas señales tienen que coincidir.
  it('respeta apto_vegano=false del LLM cuando los ingredientes vienen vacíos', () => {
    const r = apply_rules(
      makeProduct({
        producto: 'Ravioles de carne y espinaca',
        ingredientes_detectados: [],
        alergenos: [],
        apto_vegano: false,
      }),
    );
    expect(r.apto_vegano).toBe(false);
    expect(r.reglas_aplicadas).toContain('llm_marca_no_vegano');
  });

  it('respeta apto_celiaco=false del LLM cuando los ingredientes vienen vacíos', () => {
    const r = apply_rules(
      makeProduct({
        ingredientes_detectados: [],
        alergenos: [],
        apto_celiaco: false,
      }),
    );
    expect(r.apto_celiaco).toBe(false);
    expect(r.reglas_aplicadas).toContain('llm_marca_no_celiaco');
  });

  it('respeta apto_sin_lactosa=false del LLM cuando los ingredientes vienen vacíos', () => {
    const r = apply_rules(
      makeProduct({
        ingredientes_detectados: [],
        alergenos: [],
        apto_sin_lactosa: false,
      }),
    );
    expect(r.apto_sin_lactosa).toBe(false);
    expect(r.reglas_aplicadas).toContain('llm_marca_con_lactosa');
  });

  it('regla local downgrade gana incluso si el LLM dijo apto=true', () => {
    // Caso opuesto: LLM optimista, regla local detecta gluten → no apto.
    const r = apply_rules(
      makeProduct({
        ingredientes_detectados: ['harina de trigo'],
        apto_celiaco: true,
      }),
    );
    expect(r.apto_celiaco).toBe(false);
    expect(r.reglas_aplicadas).toContain('contiene_gluten');
    expect(r.reglas_aplicadas).not.toContain('llm_marca_no_celiaco');
  });
});

describe('apply_rules — happy path (apto en todo)', () => {
  it('passes a vegan + celiac + lactose-free product', () => {
    const r = apply_rules(
      makeProduct({
        ingredientes_detectados: ['agua', 'sal', 'aceite de oliva'],
        alergenos: [],
      }),
    );
    expect(r).toEqual({
      apto_vegano: true,
      apto_celiaco: true,
      apto_sin_lactosa: true,
      reglas_aplicadas: [],
    });
  });

  it('returns all three apto=true on a product with no ingredients (defensive default)', () => {
    const r = apply_rules(makeProduct({ ingredientes_detectados: [] }));
    expect(r.apto_vegano).toBe(true);
    expect(r.apto_celiaco).toBe(true);
    expect(r.apto_sin_lactosa).toBe(true);
    expect(r.reglas_aplicadas).toEqual([]);
  });
});

describe('apply_rules — edge cases (spec §10)', () => {
  it('"avena" alone disqualifies celiac (uncertified default — conservador)', () => {
    expect(apply_rules(makeProduct({ ingredientes_detectados: ['avena'] })).apto_celiaco).toBe(
      false,
    );
  });

  it('"avena" + categoria "sin TACC" does NOT disqualify celiac (certified exception)', () => {
    const r = apply_rules(
      makeProduct({
        ingredientes_detectados: ['avena', 'azúcar'],
        categoria: 'sin TACC',
      }),
    );
    expect(r.apto_celiaco).toBe(true);
    expect(r.reglas_aplicadas).not.toContain('contiene_gluten');
  });

  it('"sin TACC" exception does NOT extend to other gluten cereals (trigo still disqualifies)', () => {
    const r = apply_rules(
      makeProduct({
        ingredientes_detectados: ['avena', 'trigo'],
        categoria: 'sin TACC',
      }),
    );
    expect(r.apto_celiaco).toBe(false);
  });

  it('ingredient with parentheses "azúcar (mascabo)" does not falsely flag any blacklist', () => {
    const r = apply_rules(makeProduct({ ingredientes_detectados: ['azúcar (mascabo)'] }));
    expect(r).toMatchObject({
      apto_vegano: true,
      apto_celiaco: true,
      apto_sin_lactosa: true,
    });
  });

  it('"harina (de trigo)" with parens still matches the trigo blacklist after normalize', () => {
    const r = apply_rules(makeProduct({ ingredientes_detectados: ['harina (de trigo)'] }));
    expect(r.apto_celiaco).toBe(false);
  });

  it('"aceite de girasol" (unspecified vegetable oil) stays vegan by default', () => {
    expect(
      apply_rules(makeProduct({ ingredientes_detectados: ['aceite de girasol'] })).apto_vegano,
    ).toBe(true);
  });

  it('compound disqualification: gluten + leche + huevo → all three apto=false', () => {
    const r = apply_rules(
      makeProduct({
        ingredientes_detectados: ['harina de trigo', 'leche en polvo'],
        alergenos: ['gluten', 'leche', 'huevo'],
      }),
    );
    expect(r).toEqual({
      apto_vegano: false,
      apto_celiaco: false,
      apto_sin_lactosa: false,
      reglas_aplicadas: ['contiene_gluten', 'contiene_lacteos', 'contiene_origen_animal'],
    });
  });

  it('reglas_aplicadas is ordered consistently: gluten, lacteos, origen_animal', () => {
    const r = apply_rules(
      makeProduct({
        ingredientes_detectados: ['huevo', 'leche', 'trigo'],
      }),
    );
    expect(r.reglas_aplicadas).toEqual([
      'contiene_gluten',
      'contiene_lacteos',
      'contiene_origen_animal',
    ]);
  });
});
