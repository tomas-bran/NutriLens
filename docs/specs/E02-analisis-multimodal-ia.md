# Spec E02 — Análisis multimodal y extracción estructurada

> Spec de la épica E02. Define el endpoint de análisis, los prompts versionados, el schema canónico de salida, la validación y el manejo de errores del modelo.

**User stories cubiertas:** US-08, US-09, US-10, US-11, US-12, US-13, US-14, US-15.
**Depende de:** [`00-overview.md`](./00-overview.md), [`E01-onboarding-y-upload.md`](./E01-onboarding-y-upload.md).

---

## 1. Goals & Non-goals

**Goals**

- Convertir una imagen o PDF de etiqueta alimentaria en un JSON estructurado con ingredientes, alérgenos, sellos, categoría y `confidence`.
- Garantizar consistencia: el JSON cumple un schema Zod versionado.
- Versionar el prompt para trazabilidad (saber con qué versión se generó cada producto).
- Aislar al resto del sistema de la elección del proveedor (Phi via Foundry hoy, GPT-4o mañana) detrás de la interface `IaProvider`.
- Manejar timeouts, rate limits y respuestas inválidas sin romper la UX.

**Non-goals**

- Aplicar reglas de aptitud / riesgo → eso es **E03**.
- Generar la explicación en lenguaje simple → es **E03**.
- Guardar el resultado → es **E04**.
- Mostrar el JSON en la UI → es **E06** (US-34).

---

## 2. Modelo y prompt

### 2.1 Modelo

- **Actual:** `Phi-4-multimodal-instruct` (Microsoft) via Azure AI Foundry MaaS — multimodal vision + text.
- **Upgrade path:** `gpt-4o` (Azure OpenAI) cuando el acceso esté aprobado. El switch es solo un cambio de implementación del `IaProvider`; el prompt y el schema no cambian.
- **Sin `response_format: json_object` nativo:** Phi no lo soporta. Forzamos JSON estricto vía prompt y parseamos tolerando ` ```json … ``` ` o texto extra.
- **`temperature: 0.1`** y **`max_tokens: 1500`** alcanzan para JSON de productos típicos.

### 2.2 Prompt versionado `extract_product-v1`

Vive en `lib/ai/prompts/extract_product-v1.md`:

```
SISTEMA
Sos un asistente experto en etiquetas alimentarias argentinas. Recibís
una imagen o PDF de la etiqueta de un producto. Tu tarea es extraer
información ESTRICTAMENTE visible en la imagen y devolver un JSON que
cumpla el schema indicado.

REGLAS
1. No inventes datos. Si un campo no es visible, devolvé un valor por
   defecto (array vacío, false, "otros") y bajá tu confidence.
2. Reconocé los sellos del frente del paquete del sistema argentino:
   "exceso en azúcares", "exceso en sodio", "exceso en grasas saturadas",
   "exceso en grasas totales", "exceso en calorías". Nombres tal cual.
3. Los alérgenos se mapean a esta lista corta:
   ["gluten", "leche", "huevo", "soja", "frutos secos", "maní",
    "pescado", "crustáceos", "sulfitos", "sésamo"].
4. La categoría es uno de:
   ["galletitas", "cereales", "snacks", "lácteos", "bebidas",
    "sin TACC", "veganos", "otros"]. Usá "otros" cuando dudes.
5. confidence ∈ [0, 1]: tu confianza global de la extracción.

SCHEMA DE SALIDA (json_object)
{
  "producto": string,
  "categoria": string,
  "ingredientes_detectados": string[],
  "alergenos": string[],
  "sellos": string[],
  "apto_vegano": boolean,
  "apto_celiaco": boolean,
  "apto_sin_lactosa": boolean,
  "riesgo": "bajo" | "medio" | "alto",
  "confidence": number
}

IMPORTANTE: las flags apto_* y riesgo son aproximaciones tuyas; el
sistema las recalcula después con reglas propias. Devolvelas igual
para que el frontend tenga un fallback.
```

Cuando el prompt cambie, pasa a `extract_product-v2.md` y se guarda en el `pipelineTrace.details.promptVersion`.

---

## 3. Endpoint `POST /api/analyze` — pipeline completo

E01 cubrió la **entrada** (validate_file + detect_label_kind). E02 agrega el step central de extracción.

```
[validate_file]            (E01)
       ↓
[detect_label_kind]        (E01, Phi-4-multimodal)
       ↓
[extract_with_ia]          (E02, Phi-4-multimodal)   ← este spec
       ↓
[validate_schema]          (E02)                     ← este spec
       ↓
[apply_rules + risk]       (E03)
       ↓
[generate_explanation]     (E03, Phi-4-mini)
       ↓
[persist]                  (E04)
       ↓
respond 200
```

---

## 4. Step `extract_with_ia`

```ts
// lib/pipeline/steps/extract_with_ia.ts
export async function extract_with_ia(
  ctx: AnalysisContext,
  ia: IaProvider,
): Promise<AnalysisContext> {
  // Cache por hash
  const cached = await cache.get(`extract:${ctx.file.hash}:extract_product-v1`);
  if (cached) {
    return {
      ...ctx,
      product: cached,
      trace: trace(ctx, 'extract_with_ia', 'ok', { cached: true }),
    };
  }

  const { raw, usage, latencyMs } = await ia.analyzeLabel(ctx.file.buffer, ctx.file.mime, {
    promptVersion: 'extract_product-v1',
    timeoutMs: 25_000,
  });

  // Solo guardamos el raw aquí; la validación es un step aparte
  return {
    ...ctx,
    extractionRaw: raw,
    trace: trace(ctx, 'extract_with_ia', 'ok', {
      tokensIn: usage.in,
      tokensOut: usage.out,
      latencyMs,
      model: 'Phi-4-multimodal-instruct',
      promptVersion: 'extract_product-v1',
    }),
  };
}
```

### 4.1 Decisiones del step

- **Timeout 25s.** Más allá → `model_timeout`.
- **Un solo reintento** ante `429`/`5xx` con backoff 2s. Después → `model_rate_limited` / `model_error`.
- **JSON forzado por prompt** (Phi no soporta `response_format: json_object` nativo). El provider llama a `stripJsonFences` sobre la salida antes de devolverla.
- **Sin streaming.** No tiene sentido para nuestro flujo (el frontend espera el JSON entero).
- **El raw se guarda en `ctx.extractionRaw`** y se persiste como `json_raw` (ver E04). Útil para debugging y para regenerar reglas si las cambiamos sin re-extraer.

---

## 5. Step `validate_schema`

```ts
// lib/pipeline/steps/validate_schema.ts
import { ProductExtractionSchema } from '@/packages/schemas/product';

export async function validate_schema(ctx: AnalysisContext, ia: IaProvider) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(ctx.extractionRaw!);
  } catch {
    return retryOrFail(ctx, ia, 'invalid_json');
  }

  const result = ProductExtractionSchema.safeParse(parsed);
  if (!result.success) {
    return retryOrFail(ctx, ia, 'schema_violation', { issues: result.error.issues });
  }

  return { ...ctx, product: result.data, trace: trace(ctx, 'validate_schema', 'ok') };
}

async function retryOrFail(ctx, ia, reason, details = {}) {
  if (ctx.retries.validate_schema >= 1) {
    throw new ApiError(
      'extraction_invalid',
      'No pudimos interpretar el resultado del análisis. Probá con otra imagen.',
      422,
      { reason, ...details },
    );
  }
  // Single corrective retry: pedimos al modelo que ajuste su respuesta.
  const { raw } = await ia.analyzeLabel(ctx.file.buffer, ctx.file.mime, {
    promptVersion: 'extract_product-v1-corrective',
    extra: { previous: ctx.extractionRaw, problems: details },
  });
  ctx.retries.validate_schema = 1;
  ctx.extractionRaw = raw;
  return validate_schema(ctx, ia);
}
```

### 5.1 Prompt correctivo `extract_product-v1-corrective`

Se manda solo si la primera respuesta falla la validación de schema:

```
La respuesta anterior no cumple el schema. Errores:
{{problems}}

Tu respuesta anterior fue:
{{previous}}

Volvé a responder cumpliendo ESTRICTAMENTE el schema. Solo JSON.
```

Si el segundo intento también falla, devolvemos `extraction_invalid` y NO persistimos.

---

## 6. Schemas Zod (canónicos)

```ts
// packages/schemas/product.ts
import { z } from 'zod';

export const ALERGENOS = [
  'gluten',
  'leche',
  'huevo',
  'soja',
  'frutos secos',
  'maní',
  'pescado',
  'crustáceos',
  'sulfitos',
  'sésamo',
] as const;

export const SELLOS = [
  'exceso en azúcares',
  'exceso en sodio',
  'exceso en grasas saturadas',
  'exceso en grasas totales',
  'exceso en calorías',
] as const;

export const CATEGORIAS = [
  'galletitas',
  'cereales',
  'snacks',
  'lácteos',
  'bebidas',
  'sin TACC',
  'veganos',
  'otros',
] as const;

export const ProductExtractionSchema = z.object({
  producto: z.string().min(1).max(200),
  categoria: z.enum(CATEGORIAS),
  ingredientes_detectados: z.array(z.string().min(1)).default([]),
  alergenos: z.array(z.enum(ALERGENOS)).default([]),
  sellos: z.array(z.enum(SELLOS)).default([]),
  apto_vegano: z.boolean(),
  apto_celiaco: z.boolean(),
  apto_sin_lactosa: z.boolean(),
  riesgo: z.enum(['bajo', 'medio', 'alto']),
  confidence: z.number().min(0).max(1),
});

export type ProductExtraction = z.infer<typeof ProductExtractionSchema>;
```

Si el modelo devuelve un alérgeno o sello fuera de la lista, lo descartamos en lugar de fallar. Esto se hace con un `.catch` o un transform previo a la validación final.

---

## 7. Implementación del `IaProvider` (SDK OpenAI sobre Azure AI Foundry)

Azure AI Foundry expone un endpoint **OpenAI-compatible** (`/openai/v1`), así que usamos directamente el SDK `openai` apuntando al baseURL del resource. Un solo cliente sirve para todos los modelos del recurso (Phi-4-multimodal y Phi-4-mini), se distinguen por el campo `model` en cada request.

````ts
// lib/ai/foundry_provider.ts
import OpenAI from 'openai';

export class FoundryProvider implements IaProvider {
  private client = new OpenAI({
    baseURL: process.env.AZURE_AI_FOUNDRY_ENDPOINT!, // .../openai/v1
    apiKey: process.env.AZURE_AI_FOUNDRY_KEY!,
  });
  private MM = process.env.AZURE_AI_FOUNDRY_MODEL_MULTIMODAL!; // "Phi-4-multimodal-instruct"
  private MINI = process.env.AZURE_AI_FOUNDRY_MODEL_MINI!; // "Phi-4-mini-instruct"

  async analyzeLabel(file: Buffer, mime: string, opts) {
    const start = Date.now();
    const dataUrl = `data:${mime};base64,${file.toString('base64')}`;

    const r = await this.client.chat.completions.create({
      model: this.MM, // Phi-4-multimodal-instruct
      max_tokens: 1500,
      temperature: 0.1,
      messages: [
        { role: 'system', content: PROMPTS[opts.promptVersion] },
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
    });

    const raw = r.choices[0]?.message?.content ?? '';
    return {
      raw: stripJsonFences(raw),
      usage: {
        in: r.usage?.prompt_tokens ?? 0,
        out: r.usage?.completion_tokens ?? 0,
      },
      latencyMs: Date.now() - start,
    };
  }

  async classifyLabelKind(file, mime, opts) {
    // mismo cliente, mismo modelo MM, prompt corto detect_label_kind-v1.
  }

  async generateExplanation(product, opts) {
    // mismo cliente, model: this.MINI, sin imagen, max_tokens 200.
  }

  async answerWithContext(question, products, opts) {
    // mismo cliente, model: this.MINI, prompt RAG con productos en contexto.
  }
}

/** Saca fences ```json … ``` o texto extra antes/después del JSON. */
function stripJsonFences(text: string): string {
  const fence = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(text);
  if (fence) return fence[1].trim();
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first >= 0 && last > first) return text.slice(first, last + 1);
  return text.trim();
}
````

Notas:

- **Un solo cliente HTTP** comparte conexión TCP y reintentos para ambos modelos. Cambia solo el `model` en cada call.
- Phi vía Foundry **no soporta `response_format: { type: 'json_object' }`** de forma confiable hoy — forzamos JSON via prompt y limpiamos con `stripJsonFences`. Si en pruebas vemos que sí lo soporta consistentemente, lo activamos y removemos `stripJsonFences`.
- **`temperature: 0.1`** para extracción.
- **`max_tokens: 1500`** alcanza para JSON de productos típicos.
- **PDF:** Phi-4-multimodal acepta PDFs nativos via `data:application/pdf;base64,...`. Si en pruebas vemos que no rinde, activamos Document Intelligence como pre-step (ver §10).
- **Errores:** el SDK `openai` lanza `APIError` con `status`. Mapeamos: `429 → model_rate_limited`, `408|504 → model_timeout`, `>=500 → model_error`. Un único reintento con backoff 2s antes de fallar.

### 7.1 Mismo provider para Azure OpenAI (cuando se apruebe el acceso)

Como el endpoint de Azure OpenAI **también es OpenAI-compatible** (`https://<resource>.openai.azure.com/openai/v1`), la implementación es **literalmente la misma clase** apuntando a otras env vars:

```ts
// lib/ai/azure_openai_provider.ts
export class AzureOpenAIProvider extends FoundryProvider {
  constructor() {
    super();
    (this as any).client = new OpenAI({
      baseURL: process.env.AZURE_OPENAI_ENDPOINT!,
      apiKey: process.env.AZURE_OPENAI_KEY!,
    });
    (this as any).MM = process.env.AZURE_OPENAI_MODEL_GPT4O!;
    (this as any).MINI = process.env.AZURE_OPENAI_MODEL_GPT4O_MINI!;
  }
}
```

El switch entre providers se hace por env var `IA_PROVIDER` en el bootstrap:

```ts
// lib/ai/index.ts
export const ia: IaProvider =
  process.env.IA_PROVIDER === 'azure-openai'
    ? new AzureOpenAIProvider()
    : process.env.IA_PROVIDER === 'foundry'
      ? new FoundryProvider()
      : new MockIaProvider();
```

**Migrar de Phi a GPT-4o cuando aprueben el acceso es solo cambiar las 4 env vars y `IA_PROVIDER=azure-openai`.** El código del provider y los prompts no cambian.

---

## 8. Mock provider (dev y tests)

```ts
// lib/ai/mock_provider.ts
export class MockIaProvider implements IaProvider {
  async analyzeLabel(file: Buffer, mime: string, opts) {
    const fixture = await loadFixture(fileHash(file), 'extract');
    return { raw: fixture, usage: { in: 0, out: 0 }, latencyMs: 5 };
  }
  // ...
}
```

Fixtures en `tests/fixtures/ai/extract/<hash>.json`. El CI no consume tokens.

---

## 9. Errores específicos de E02

| Código               | HTTP | Cuándo                                                                 |
| -------------------- | ---- | ---------------------------------------------------------------------- |
| `model_timeout`      | 504  | `analyzeLabel` no responde en 25s                                      |
| `model_rate_limited` | 429  | Azure devuelve 429 incluso tras el retry                               |
| `model_error`        | 502  | Cualquier 5xx del proveedor tras el retry                              |
| `extraction_invalid` | 422  | El JSON no parsea o no cumple schema, incluso tras el retry correctivo |

Todos incluyen `details.requestId` y `details.promptVersion`.

---

## 10. Estrategia para PDFs

Plan A (default): mandar el PDF directo a `Phi-4-multimodal` como `data:application/pdf;base64,...`. `Phi-4-multimodal` lo procesa.

Plan B (si Plan A no rinde en tests): pre-step de OCR con **Azure AI Document Intelligence** `prebuilt-read`:

```ts
// lib/pipeline/steps/ocr_pdf.ts
async function ocr_pdf_if_needed(ctx) {
  if (ctx.file.mime !== 'application/pdf') return ctx;
  const text = await documentIntelligence.analyzeRead(ctx.file.buffer);
  ctx.pdfText = text;
  return ctx;
}
```

Y modificamos el prompt para mandar `pdfText` junto a una imagen renderizada de la página 1. Activado por flag `USE_DOC_INTELLIGENCE=true`.

---

## 11. Logging

| Evento                  | Campos clave                                                    |
| ----------------------- | --------------------------------------------------------------- |
| `extract.started`       | `requestId`, `mime`, `fileHash`, `promptVersion`, `model`       |
| `extract.completed`     | `requestId`, `tokensIn`, `tokensOut`, `latencyMs`, `confidence` |
| `extract.cache_hit`     | `requestId`, `fileHash`                                         |
| `extract.schema_failed` | `requestId`, `issues`, `attempt`                                |
| `extract.failed`        | `requestId`, `error`, `reason`                                  |

---

## 12. Tests

**Unit**

- `ProductExtractionSchema` con 5 fixtures válidos y 5 inválidos.
- Sanitizado de alérgenos/sellos fuera de la lista.

**Integration**

- `validate_schema` con respuesta inválida → reintento correctivo → segunda válida = ok.
- `validate_schema` con dos respuestas inválidas → `extraction_invalid`.
- `extract_with_ia` con timeout simulado → `model_timeout`.
- `extract_with_ia` con cache hit → no llama al provider.

**Snapshot**

- Set de 20 imágenes representativas (galletitas, cereales, snacks, lácteos, bebidas, sin TACC, veganos) → para cada una, snapshot del JSON. Se revisa manualmente al cambiar el prompt.

---

## 13. Decisiones técnicas y trade-offs

| Decisión                                                                 | Alternativa descartada                            | Por qué                                                                      |
| ------------------------------------------------------------------------ | ------------------------------------------------- | ---------------------------------------------------------------------------- |
| Una sola call multimodal por archivo (extracción + clasificación previa) | dos modelos distintos para detección y extracción | Phi-4-multimodal sirve para ambos casos; simplifica deployment               |
| `response_format: json_object`                                           | parse libre del texto                             | garantiza JSON, evita errores triviales                                      |
| Validación con Zod fuera del provider                                    | dentro del provider                               | desacopla el adaptador del dominio                                           |
| Un único retry correctivo                                                | reintentos infinitos                              | costo controlado; mejor fallar rápido que quemar tokens                      |
| `temperature: 0.1`                                                       | `0.0`                                             | mantiene una mínima variabilidad para casos ambiguos sin perder consistencia |
| Cache por hash + promptVersion                                           | cache solo por hash                               | si cambiamos el prompt, el cache se invalida automáticamente                 |
| PDF directo a `Phi-4-multimodal` antes que Doc Intelligence              | activar OCR siempre                               | Doc Intelligence cuesta por página; lo evitamos si no hace falta             |

---

## 14. Casos borde

- **Etiqueta en inglés/portugués**: el modelo igual extrae; los nombres de alérgenos y sellos en el schema están en español, así que el modelo "traduce" en el prompt. Si vemos errores, agregamos un map de aliases en el sanitizer.
- **Etiqueta muy borrosa**: `confidence < 0.6` → seguimos el flujo pero E03 agrega badge "Confianza baja".
- **Producto que no es alimento pero el filtro lo dejó pasar**: el modelo extrae cualquier cosa; las reglas de E03 dan `riesgo: medio` y la UI muestra el JSON. Aceptable para MVP.
- **Sello que no está en la lista**: lo descartamos. Si se repite muchas veces, lo agregamos a `SELLOS`.
- **Imagen con varias etiquetas (combo)**: el modelo elige una; documentado como limitación.

---

## 15. Métricas

- p50/p95 de `extract_with_ia.latencyMs`.
- `extract.success_rate`.
- `extract.schema_failure_rate` (incluye reintento).
- `extract.cache_hit_rate`.
- Distribución de `confidence` (histograma).
- Tokens promedio por análisis (para forecast de costo).
