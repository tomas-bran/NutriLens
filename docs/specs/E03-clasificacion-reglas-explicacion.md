# Spec E03 — Clasificación, reglas y explicación

> Spec de la épica E03. Define las reglas determinísticas que se aplican sobre el JSON extraído (aptitud + riesgo), el prompt y formato de la explicación, y los disclaimers obligatorios.

**User stories cubiertas:** US-16, US-17, US-18, US-19, US-20.
**Depende de:** [`00-overview.md`](./00-overview.md), [`E02-analisis-multimodal-ia.md`](./E02-analisis-multimodal-ia.md).

---

## 1. Goals & Non-goals

**Goals**

- Decidir `apto_vegano`, `apto_celiaco`, `apto_sin_lactosa` con reglas propias (no confiar en el modelo).
- Calcular `riesgo ∈ {bajo, medio, alto}` con una fórmula determinística.
- Generar una explicación corta en lenguaje claro a partir del producto procesado.
- Mostrar disclaimers visibles tanto en pantalla de resultado como en respuestas del chat.
- Avisar al usuario cuando la `confidence` de la extracción es baja.

**Non-goals**

- Persistir el producto → E04.
- Mostrar el JSON o el pipeline en UI → E06.
- Diagnóstico médico o recomendaciones de salud — explícitamente prohibido.

---

## 2. Steps que aporta esta épica

```
... extract_with_ia (E02) → validate_schema (E02)
       ↓
[apply_rules]              ← este spec
       ↓
[compute_risk]             ← este spec
       ↓
[generate_explanation]     ← este spec (Phi-4-mini)
       ↓
... persist (E04)
```

`apply_rules` y `compute_risk` son **puros** (sin I/O); `generate_explanation` llama a la IA y guarda caché.

---

## 3. Reglas de aptitud — `apply_rules`

### 3.1 Listas negras configurables

Viven en `lib/rules/blacklists.ts` y se exportan como `const`:

```ts
export const NO_CELIAC = [
  // ingredientes que contienen gluten
  'trigo', 'harina de trigo', 'cebada', 'malta', 'malta de cebada',
  'centeno', 'avena', // avena no certificada
  'gluten', 'sémola', 'cuscús', 'bulgur', 'almidón de trigo',
];

export const NO_LACTOSE = [
  'leche', 'leche en polvo', 'leche entera', 'leche descremada',
  'lactosa', 'suero', 'suero de leche', 'caseína', 'caseinato',
  'manteca', 'crema', 'yogur', 'queso', 'ricota', 'requesón',
];

export const NO_VEGAN = [
  ...NO_LACTOSE,
  // animal (excepto lácteos, ya cubiertos arriba)
  'carne', 'pollo', 'cerdo', 'pescado', 'atún', 'salmón',
  'gelatina', 'huevo', 'clara de huevo', 'yema', 'miel',
  'cochinilla', 'carmín', 'ácido carmínico', 'shellac',
];
```

> Las listas se mantienen en lower-case ASCII (sin tildes para matching). El comparador hace `normalize()` antes del `includes`.

### 3.2 Función `apply_rules`

```ts
// lib/rules/apply.ts
import { normalize } from './normalize';

export type RulesResult = {
  apto_vegano: boolean;
  apto_celiaco: boolean;
  apto_sin_lactosa: boolean;
  reglas_aplicadas: string[];   // ej. ["contiene_gluten", "contiene_lactosa"]
};

export function apply_rules(product: ProductExtraction): RulesResult {
  const ingredientes = product.ingredientes_detectados.map(normalize);
  const alergenos    = product.alergenos.map(normalize);

  const matches = (haystack: string[], needles: string[]) =>
    needles.some((n) => haystack.some((h) => h.includes(n)));

  const tieneGluten   = alergenos.includes('gluten') || matches(ingredientes, NO_CELIAC);
  const tieneLacteos  = alergenos.includes('leche')  || matches(ingredientes, NO_LACTOSE);
  const tieneAnimal   = matches(ingredientes, NO_VEGAN) || product.alergenos.includes('huevo');

  const reglas: string[] = [];
  if (tieneGluten)  reglas.push('contiene_gluten');
  if (tieneLacteos) reglas.push('contiene_lacteos');
  if (tieneAnimal)  reglas.push('contiene_origen_animal');

  return {
    apto_celiaco: !tieneGluten,
    apto_sin_lactosa: !tieneLacteos,
    apto_vegano: !tieneAnimal,
    reglas_aplicadas: reglas,
  };
}
```

### 3.3 Decisiones de las reglas

- **Conservador por default**: si un ingrediente no es claro o el modelo no lo extrajo, NO marcamos el producto como apto. Preferimos un falso negativo (decir que no es apto cuando podría serlo) a un falso positivo (decir apto algo que no lo es) — esto reduce riesgo de "respuesta médica" equivocada.
- **Trazabilidad**: devolvemos `reglas_aplicadas` para que la UI o el chat puedan explicar **por qué** marcamos algo como no apto.
- **No usamos el `apto_*` del modelo** — solo lo guardamos en `json_raw` como referencia.

---

## 4. Cálculo de riesgo — `compute_risk`

### 4.1 Fórmula

```ts
// lib/rules/risk.ts
export function compute_risk(p: ProductExtraction, r: RulesResult): 'bajo'|'medio'|'alto' {
  const sellos    = p.sellos.length;
  const alergenos = p.alergenos.length;

  if (sellos >= 2) return 'alto';
  if (sellos === 1) {
    if (alergenos >= 2) return 'alto';
    return 'medio';
  }
  // sellos === 0
  if (alergenos === 0 && r.reglas_aplicadas.length === 0) return 'bajo';
  return 'medio';
}
```

### 4.2 Tabla de verdad (resumen)

| `sellos` | `alergenos` | `reglas_aplicadas` | `riesgo` |
|---------|------------|-------------------|---------|
| 0       | 0          | 0                 | bajo    |
| 0       | ≥1         | cualquiera        | medio   |
| 1       | 0–1        | cualquiera        | medio   |
| 1       | ≥2         | cualquiera        | alto    |
| ≥2      | cualquiera | cualquiera        | alto    |

### 4.3 Override por baja confianza

Si `product.confidence < 0.6`, **no** modificamos el `riesgo` calculado, pero la UI agrega un badge "Confianza baja, verificá manualmente" (ver §6.3). La motivación: no queremos disfrazar la incertidumbre como un cambio de riesgo; preferimos que el usuario lo sepa.

---

## 5. Explicación en lenguaje simple — `generate_explanation`

### 5.1 Quién la genera

Usa `Phi-4-mini-instruct` (text-only). Recibe como input el `ProductExtraction` + `RulesResult` ya calculados. **No** mandamos la imagen — eso ahorra tokens y reduce alucinación visual.

### 5.2 Prompt `explain_product-v1`

```
SISTEMA
Sos un asistente que explica análisis de etiquetas alimentarias en
español rioplatense, claro y breve.

REGLAS DE TONO
- 2 a 3 oraciones, no más.
- No uses jerga técnica.
- NUNCA digas "consultá a un médico", "es peligroso para tu salud",
  "no consumir bajo ningún concepto" ni nada parecido. Somos
  informativos, no clínicos.
- Si el producto tiene restricciones relevantes, mencionalas
  explícitamente (gluten, lactosa, origen animal, sellos).
- Cerrá con: "Recordá que NutriLens es un asistente informativo."

ENTRADA
Producto: {{producto}}
Categoría: {{categoria}}
Alérgenos detectados: {{alergenos}}
Sellos: {{sellos}}
Aptitudes calculadas: vegano={{apto_vegano}}, celíaco={{apto_celiaco}}, sin_lactosa={{apto_sin_lactosa}}
Riesgo: {{riesgo}}
Reglas aplicadas: {{reglas_aplicadas}}
Confidence: {{confidence}}

SALIDA
Una única explicación en texto plano. Sin markdown.
```

### 5.3 Step

```ts
// lib/pipeline/steps/generate_explanation.ts
export async function generate_explanation(ctx: AnalysisContext, ia: IaProvider) {
  const key = `explain:${ctx.product!.hash ?? ctx.file.hash}:explain_product-v1`;
  const cached = await cache.get(key);
  if (cached) return { ...ctx, explanation: cached };

  const { text, usage, latencyMs } = await ia.generateExplanation(
    ctx.product!,
    { promptVersion: 'explain_product-v1', timeoutMs: 10_000 }
  );

  const explanation = sanitize(text);          // ver §5.5
  await cache.set(key, explanation, { ttlSeconds: 3600 * 24 });
  return { ...ctx, explanation };
}
```

### 5.4 Errores tolerados

- **Timeout / 5xx**: NO bloquea la respuesta. Si falla, persistimos con `explanation = null` y la UI muestra un fallback genérico ("Análisis listo. Mirá el detalle abajo."). La explicación es un nice-to-have, no un must.

### 5.5 Sanitización de salida

Regex de blocklist antes de devolver el texto:

```ts
const BLOCKED_PHRASES = [
  /\bconsult[áa]\s+(?:a\s+un\s+)?m[ée]dic[oa]\b/i,
  /\bpeligros[oa]\s+para\s+tu\s+salud\b/i,
  /\bno\s+consumir\b/i,
  /\bes\s+t[óo]xico\b/i,
];

function sanitize(text: string) {
  let out = text.trim();
  for (const rx of BLOCKED_PHRASES) {
    if (rx.test(out)) out = out.replace(rx, '[texto removido]');
  }
  if (!out.includes('NutriLens es un asistente informativo')) {
    out += ' Recordá que NutriLens es un asistente informativo.';
  }
  return out;
}
```

Si removemos algo, logueamos `explanation.sanitized` con la frase encontrada (sin el contenido para no contaminar logs).

---

## 6. UI — visualización del análisis (input para E06)

### 6.1 Layout de la pantalla de resultado

```
┌────────────────────────────────────────────────┐
│ [Imagen del producto]                          │
│ Nombre del producto                            │
│ Categoría · Fecha                              │
├────────────────────────────────────────────────┤
│ Riesgo: [BAJO/MEDIO/ALTO] (color del badge)    │
│ Aptitudes: [✓/✗ Vegano] [✓/✗ Celíaco] [✓/✗ Sin lactosa] │
├────────────────────────────────────────────────┤
│ Explicación                                    │
│ <texto generado en §5>                         │
├────────────────────────────────────────────────┤
│ Alérgenos: chips                               │
│ Sellos: chips                                  │
│ Ingredientes: lista                            │
├────────────────────────────────────────────────┤
│ ⓘ NutriLens es un asistente informativo,      │
│   no reemplaza el consejo de un profesional    │
│   de nutrición.                                │
├────────────────────────────────────────────────┤
│ [ ] Ver JSON extraído (colapsable)             │
│ [ ] Ver pipeline del análisis (colapsable)     │
└────────────────────────────────────────────────┘
```

### 6.2 Colores de riesgo (tokens del design system, ver E06)

| `riesgo` | Token | Uso visual |
|---------|------|-----------|
| `bajo`  | `--color-risk-low`  (verde)  | badge + borde sutil |
| `medio` | `--color-risk-medium` (ámbar) | idem |
| `alto`  | `--color-risk-high`  (rojo)  | idem |

### 6.3 Badge "Confianza baja"

Si `confidence < 0.6`:

```
┌──────────────────────────────────────────────┐
│ ⚠ Confianza baja                             │
│ El análisis puede tener errores. Probá       │
│ con una foto más nítida.                     │
└──────────────────────────────────────────────┘
```

Se muestra arriba del bloque "Riesgo".

### 6.4 Disclaimer global

Texto fijo, **siempre visible** en:

- Pantalla de resultado (`/analizar/[id]`).
- Pantalla de detalle desde historial (`/historial/[id]`).
- Respuesta del chat (al final del texto de cada respuesta, ver E05).

Componente: `<Disclaimer />` en `components/ui/Disclaimer.tsx`.

---

## 7. Logging

| Evento | Cuándo | Campos clave |
|--------|--------|-------------|
| `rules.applied` | Termina `apply_rules` | `requestId`, `reglas_aplicadas` |
| `risk.computed` | Termina `compute_risk` | `requestId`, `riesgo`, `sellos`, `alergenos` |
| `explanation.generated` | Termina `generate_explanation` ok | `requestId`, `tokensIn`, `tokensOut`, `latencyMs`, `cached` |
| `explanation.failed` | Falla la generación | `requestId`, `error` |
| `explanation.sanitized` | Sanitizamos texto | `requestId`, `pattern` |

---

## 8. Tests

**Unit (acá vive el core de la calidad)**

- `apply_rules`: matriz de casos cubriendo cada blacklist (15+ casos).
- `compute_risk`: tabla de verdad completa (§4.2) con assertions.
- `sanitize`: cada frase bloqueada → reemplazada; mensaje sin disclaimer → se le agrega; mensaje con disclaimer → idempotente.

**Snapshot**

- 10 productos de prueba con sus `RulesResult` y `riesgo` esperados.
- 10 explicaciones generadas con `MockIaProvider` → snapshot del texto sanitizado.

**E2E**

- Producto con gluten → UI muestra "✗ Celíaco" y explicación con la palabra "gluten".
- Producto sin nada → UI muestra los 3 ✓ y badge "Riesgo bajo".

---

## 9. Decisiones técnicas y trade-offs

| Decisión | Alternativa descartada | Por qué |
|---------|----------------------|--------|
| Reglas hardcoded en código (no en DB) | tabla en DB editable | velocidad para MVP, listas chicas, versionado por git suficiente |
| Cálculo determinístico de riesgo | dejar al modelo decidir | reproducible, testeable, defendible en la entrega del TP |
| Explicación con `Phi-4-mini` (text-only) | con `Phi-4-multimodal` (multimodal) | mucho más barato y calidad suficiente para 3 oraciones sin imagen |
| Sanitizador de output | confiar en el prompt | el modelo igual a veces se zafa con "consultá a un médico" |
| Disclaimer obligatorio | opcional o solo en footer | obligatorio por requerimiento del TP (RNF-03) |
| Conservador en falsos positivos | tolerante | reduce el riesgo legal/ético del MVP |

---

## 10. Casos borde

- **Producto sin ingredientes detectados (lista vacía)**: `apply_rules` no marca nada como contenido; las flags quedan `true` por default. **Pero** el `compute_risk` mira `alergenos` y `sellos`; si ambos vacíos → `bajo`. Mitigación: si `ingredientes_detectados.length === 0 && confidence < 0.6`, forzamos `riesgo='medio'` y badge "Confianza baja". Si `confidence ≥ 0.6` confiamos en que el modelo realmente vio una etiqueta limpia.
- **Avena**: la regla la marca como no-celíaca **a menos que** el modelo haya detectado el sello "sin TACC". Caso especial documentado en `lib/rules/special_cases.md`.
- **Aceites vegetales sin especificar**: vegano por default (no contiene `NO_VEGAN`).
- **Ingrediente con paréntesis (ej. "azúcar (mascabo)")**: el `normalize` quita paréntesis para mejorar el match.
- **Modelo devuelve aptitudes correctas pero contradice nuestras reglas**: ignoramos al modelo. Logueamos la divergencia como `rules.diverged_from_model` para detectar bugs en el prompt.

---

## 11. Métricas

- Distribución de `riesgo` (bajo/medio/alto).
- `rules.divergence_rate` (cuántas veces las reglas difieren del `apto_*` del modelo).
- `explanation.success_rate`.
- p50/p95 de `generate_explanation.latencyMs`.
- `explanation.sanitized_rate` (cuántas veces tocamos la salida) — si esto es > 20%, hay que mejorar el prompt.
