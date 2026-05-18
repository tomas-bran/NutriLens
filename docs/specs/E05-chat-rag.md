# Spec E05 — Chat con RAG sobre historial

> Spec de la épica E05. Define el endpoint de chat, el pipeline de retrieval + generación, los prompts versionados y la UI de mensajes con productos referenciados.

**User stories cubiertas:** US-27, US-28, US-29, US-30, US-31, US-32.
**Depende de:** [`00-overview.md`](./00-overview.md), [`E04-persistencia-e-historial.md`](./E04-persistencia-e-historial.md).

---

## 1. Goals & Non-goals

**Goals**

- Permitir consultas en lenguaje natural sobre los productos guardados.
- Recuperar productos relevantes del historial (retrieval por filtros + keywords).
- Generar una respuesta fundamentada **exclusivamente** en los productos recuperados.
- Mostrar al usuario qué productos se usaron como contexto.
- Manejar el caso "no hay productos relevantes" sin gastar tokens.
- Mantener el disclaimer obligatorio en cada respuesta.

**Non-goals**

- Persistir el historial de conversaciones (queda solo en memoria del cliente para MVP).
- Búsqueda vectorial real (embeddings) → post-MVP. Retrieval simple por filtros y LIKE.
- Streaming de tokens → post-MVP. Respuesta completa en una sola vez.
- Soporte multi-tenant / per-user → post-MVP.

---

## 2. Pipeline del chat

```
[Pregunta del usuario]
       ↓
[parse_intent]              (Phi-4-mini, salida JSON con filtros)
       ↓
[retrieve_products]         (consulta a la DB con filtros del intent)
       ↓
   ¿K productos > 0?
       │
   no  │  sí
       ▼   ▼
  [empty_response]    [generate_answer]   (Phi-4-mini con contexto)
       │                    │
       └────────────┬───────┘
                    ▼
            [respuesta + chips]
```

Dos llamadas al LLM por consulta:

1. **Parse intent** → barata, output JSON con filtros.
2. **Generate answer** → con los productos como contexto.

Si retrieval devuelve `[]`, se saltea la segunda call (ahorro de tokens).

---

## 3. Endpoint `POST /api/chat`

### 3.1 Request

```
POST /api/chat
Content-Type: application/json
X-Request-Id: <uuid v4>

{
  "question": "Mostrame galletitas aptas para celíacos",
  "conversationId": "uuid-opcional"   // para futuras features, no usado en MVP
}
```

### 3.2 Response — éxito

```json
{
  "answer": "Tenés 2 galletitas guardadas que parecen aptas para celíacos: Galletitas Sin TACC Marca X (riesgo bajo) y Galletitas de Arroz Marca Y (riesgo medio). Recordá que NutriLens es un asistente informativo.",
  "products": [
    { "id": "...", "nombre": "Galletitas Sin TACC Marca X", "riesgo": "bajo", "imagenUrl": "/..." },
    { "id": "...", "nombre": "Galletitas de Arroz Marca Y", "riesgo": "medio", "imagenUrl": "/..." }
  ],
  "intent": {
    "categoria": "galletitas",
    "apto": "celiaco",
    "keywords": []
  },
  "tokensUsed": { "in": 480, "out": 120 }
}
```

### 3.3 Response — sin productos relevantes

```json
{
  "answer": "No tengo productos guardados que respondan a esa pregunta. Subí más etiquetas para enriquecer tu historial.",
  "products": [],
  "intent": { ... },
  "tokensUsed": { "in": 0, "out": 0 }
}
```

### 3.4 Response — error

Shape común de error (`00-overview.md` §4.1). Códigos posibles: `model_timeout`, `model_rate_limited`, `model_error`, `internal_error`, `invalid_question` (400 si `question` está vacía).

---

## 4. Step `parse_intent`

### 4.1 Prompt `chat_parse_intent-v1`

```
SISTEMA
Sos un parser. Recibís una pregunta del usuario sobre productos
alimentarios guardados en su historial. Devolvés JSON con la intención.

SCHEMA DE SALIDA
{
  "kind": "filter" | "compare" | "info" | "unknown",
  "categoria": "galletitas"|"cereales"|"snacks"|"lácteos"|"bebidas"|"sin TACC"|"veganos"|"otros"|null,
  "riesgo_max": "bajo"|"medio"|"alto"|null,        // máximo riesgo aceptable
  "apto": "vegano"|"celiaco"|"sin_lactosa"|null,
  "alergeno_excluido": string|null,                  // ej. "leche"
  "keywords": string[],                              // ej. ["choco", "marca x"]
  "comparar": string[]                               // nombres de productos a comparar (si kind="compare")
}

REGLAS
- "kind": "filter" para "mostrame ...", "info" para "qué productos tengo con ...",
  "compare" si el usuario menciona explícitamente comparar dos productos.
- Si la pregunta no es interpretable, devolvé kind="unknown" con todos los demás nulos.
- Solo JSON, sin texto adicional.

EJEMPLOS
"mostrame galletitas aptas para celíacos"
→ {"kind":"filter","categoria":"galletitas","riesgo_max":null,"apto":"celiaco","alergeno_excluido":null,"keywords":[],"comparar":[]}

"qué productos tengo con leche"
→ {"kind":"info","categoria":null,"riesgo_max":null,"apto":null,"alergeno_excluido":null,"keywords":["leche"],"comparar":[]}

"dame galletitas con mejor perfil nutricional"
→ {"kind":"filter","categoria":"galletitas","riesgo_max":"bajo","apto":null,"alergeno_excluido":null,"keywords":[],"comparar":[]}

"comparame Galletitas X con Galletitas Y"
→ {"kind":"compare","categoria":null,"riesgo_max":null,"apto":null,"alergeno_excluido":null,"keywords":[],"comparar":["Galletitas X","Galletitas Y"]}
```

### 4.2 Schema Zod

```ts
export const ChatIntentSchema = z.object({
  kind: z.enum(['filter', 'compare', 'info', 'unknown']),
  categoria: z
    .enum([...CATEGORIAS, ''])
    .nullable()
    .transform((v) => (v === '' ? null : v)),
  riesgo_max: z.enum(['bajo', 'medio', 'alto']).nullable(),
  apto: z.enum(['vegano', 'celiaco', 'sin_lactosa']).nullable(),
  alergeno_excluido: z.string().nullable(),
  keywords: z.array(z.string()).default([]),
  comparar: z.array(z.string()).default([]),
});

export type ChatIntent = z.infer<typeof ChatIntentSchema>;
```

### 4.3 Modelo y config

- **Modelo:** `Phi-4-mini-instruct`.
- **JSON forzado por prompt** (Phi no soporta `response_format: json_object` nativo). El provider aplica `stripJsonFences` antes de devolver.
- **`temperature: 0`** (queremos determinismo absoluto en parsing).
- **Timeout:** 8s.
- **Max tokens:** 200.

---

## 5. Step `retrieve_products`

```ts
// lib/chat/retrieve.ts
export async function retrieve_products(intent: ChatIntent): Promise<SavedProduct[]> {
  if (intent.kind === 'unknown') return [];

  if (intent.kind === 'compare') {
    return await db.product.findMany({
      where: {
        OR: intent.comparar.map((n) => ({ nombre: { contains: n, mode: 'insensitive' } })),
      },
      take: 10,
    });
  }

  const where: Prisma.ProductWhereInput = {};
  if (intent.categoria) where.categoria = intent.categoria;
  if (intent.riesgo_max) {
    where.riesgo =
      intent.riesgo_max === 'bajo'
        ? 'bajo'
        : intent.riesgo_max === 'medio'
          ? { in: ['bajo', 'medio'] }
          : { in: ['bajo', 'medio', 'alto'] };
  }
  if (intent.apto === 'vegano') where.aptoVegano = true;
  if (intent.apto === 'celiaco') where.aptoCeliaco = true;
  if (intent.apto === 'sin_lactosa') where.aptoSinLactosa = true;
  if (intent.keywords.length > 0) {
    where.OR = intent.keywords.map((k) => ({
      OR: [
        { nombre: { contains: k, mode: 'insensitive' } },
        { ingredientes: { contains: k.toLowerCase() } },
        { alergenos: { contains: k.toLowerCase() } },
      ],
    }));
  }
  if (intent.alergeno_excluido) {
    where.NOT = { alergenos: { contains: intent.alergeno_excluido.toLowerCase() } };
  }

  return await db.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 5, // TOP-K = 5 para mantener el contexto chico
  });
}
```

### 5.1 Ranking

Para `kind=filter` con `riesgo_max=bajo` (ej. "mejor perfil nutricional"), se ordena por `(riesgo_score, sellos.length, createdAt desc)`:

```ts
const RISK_SCORE = { bajo: 0, medio: 1, alto: 2 };
results.sort((a, b) => {
  if (RISK_SCORE[a.riesgo] !== RISK_SCORE[b.riesgo]) {
    return RISK_SCORE[a.riesgo] - RISK_SCORE[b.riesgo];
  }
  return JSON.parse(a.sellos).length - JSON.parse(b.sellos).length;
});
```

### 5.2 K = 5

Limitamos a 5 productos en el contexto para que el prompt no crezca. Si hay más coincidencias, se priorizan los top-5 por ranking. La UI puede mostrar un mensaje "Mostrando los 5 más relevantes; en el historial podés ver el resto".

---

## 6. Step `generate_answer`

### 6.1 Versiones del prompt

| Versión          | Usado cuando                | Formato de salida                                                    |
| ---------------- | --------------------------- | -------------------------------------------------------------------- |
| `chat_answer-v1` | `intent.kind !== 'compare'` | Texto plano (US-29). Sin markdown.                                   |
| `chat_answer-v2` | `intent.kind === 'compare'` | Frase intro + tabla GFM (Riesgo / Alérgenos / Sellos) + frase final. |

`chat_answer-v1` se conserva para todo lo que no sea comparación. Bumpeamos a `chat_answer-v2` para `kind=compare` (US-31) porque la salida cambia de prosa a tabla — separar la versión nos deja seguir la trazabilidad de cada call al modelo (`pipelineTrace.promptVersion`).

El selector se centraliza en `pickAnswerPromptVersion(intent)` (ver `src/lib/chat/generate-answer.ts`).

### 6.2 Prompt `chat_answer-v1`

```
SISTEMA
Sos un asistente que responde preguntas sobre productos alimentarios
guardados por el usuario. Tu respuesta debe basarse EXCLUSIVAMENTE en
los productos del contexto. NO inventes productos. NO des consejos
médicos.

REGLAS DE TONO
- 2 a 4 oraciones.
- Lenguaje claro y rioplatense.
- Si el usuario pidió "el mejor" o similar, recomendá uno y explicá por qué.
- Cerrá SIEMPRE con: "Basado en productos analizados por vos. NutriLens es un asistente informativo."

ENTRADA
Pregunta: {{question}}
Productos disponibles (top 5):
{{products_json}}

SALIDA
Texto plano, sin markdown.
```

### 6.3 Prompt `chat_answer-v2` (compare — US-31)

Sólo agrega instrucciones de formato cuando `intent_kind = compare`:

```
FORMATO SEGÚN EL TIPO DE PREGUNTA
- Por defecto: TEXTO PLANO. Nada de markdown, ni bullets, ni tablas.
- Si intent.kind = compare:
  1. Frase introductoria de UNA línea presentando los productos comparados.
  2. Tabla Markdown GFM con UNA columna por producto y UNA fila por dimensión.
     Dimensiones obligatorias: **Riesgo**, **Alérgenos**, **Sellos**.
     Dimensión opcional: **Aptitudes** (vegano / celíaco / sin lactosa).
  3. Frase final con la recomendación (o "ambos son similares").
  4. Disclaimer.
```

La UI renderea la tabla con `<MarkdownMini>` (subset propio: tablas + bold; no usamos `react-markdown` para no inflar el bundle). Ver `src/components/chat/markdown-mini.tsx`.

### 6.4 Implementación

```ts
export async function generateChatAnswer(
  question: string,
  products: SavedProduct[],
  intent: ChatIntent,
  { ia }: { ia: IaProvider },
) {
  const promptVersion = pickAnswerPromptVersion(intent);
  const { raw, usage, latencyMs } = await ia.answerWithContext(question, products, {
    promptVersion,
    extra: { intent_kind: intent.kind },
    timeoutMs: 10_000,
  });
  return { answer: sanitizeChatAnswer(raw).text, promptVersion, tokensUsed: usage, latencyMs };
}
```

Reusa el `sanitize` de E03 §5.5 (mismo blocklist) parametrizado con el tail del chat (`CHAT_DISCLAIMER_TAIL`). Si el modelo omite el disclaimer, lo agrega.

### 6.5 Modelo y config

- **Modelo:** `Phi-4-mini-instruct` (ambas versiones).
- **`temperature: 0.2`**.
- **Timeout:** 10s.
- **Max tokens:** 350 (alcanza para tabla 3×4 + frase intro/final + disclaimer).

---

## 7. Empty response (sin contexto)

Cuando `retrieve_products` devuelve `[]`:

```ts
return {
  answer:
    'No tengo productos guardados que respondan a esa pregunta. Subí más etiquetas para enriquecer tu historial.',
  products: [],
  intent,
  tokensUsed: { in: 0, out: 0 },
};
```

**No** llamamos a `generate_answer`. Ahorra tokens y mantiene la respuesta consistente.

---

## 8. Caso `intent.kind === 'unknown'`

Si el parser no entendió la pregunta:

```ts
return {
  answer:
    'No te entendí bien. Probá con preguntas como "mostrame productos sin gluten" o "qué galletitas tengo guardadas".',
  products: [],
  intent,
  tokensUsed: { in: 0, out: 0 },
};
```

---

## 9. UI del chat

### 9.1 Layout

```
┌──────────────────────────────────────────────────────────┐
│ Chat sobre tus productos    [+ Nueva conversación]       │
├──────────────────────────────────────────────────────────┤
│  Vos: mostrame galletitas aptas para celíacos            │
│                                                          │
│  NutriLens: Tenés 2 galletitas...                        │
│  ┌──────┐ ┌──────┐                                       │
│  │ chip │ │ chip │   ← productos referenciados           │
│  └──────┘ └──────┘                                       │
│  ⓘ NutriLens es un asistente informativo.               │
├──────────────────────────────────────────────────────────┤
│ [Escribí tu pregunta...]                          [▶]    │
└──────────────────────────────────────────────────────────┘
```

### 9.2 Componentes

- `<ChatThread>` — lista de mensajes.
- `<UserMessage>` / `<AssistantMessage>` — burbujas alineadas.
- `<ProductChip>` — chip clickeable con `nombre + riesgo`. Click → navega a `/historial/[id]`.
- `<ChatInput>` — input + botón submit; Enter submitea, Shift+Enter nueva línea.

### 9.3 Estado en memoria

Lista de mensajes vive en un `useState` del componente página (`app/chat/page.tsx`). No persistimos.

Botón "Nueva conversación" → resetea la lista a `[]`.

### 9.4 Estados visuales

| Estado     | UI                                                                     |
| ---------- | ---------------------------------------------------------------------- |
| `IDLE`     | Input habilitado.                                                      |
| `THINKING` | Burbuja del assistant con tres puntos animados ("…"). Input bloqueado. |
| `ERROR`    | Toast "Algo salió mal" + botón "Reintentar último mensaje".            |

### 9.5 Sugerencias iniciales

Cuando el chat está vacío, mostramos 3 chips de ejemplo (envían directamente al submit):

- "Mostrame productos aptos para celíacos"
- "Qué productos tengo con leche"
- "Dame galletitas con mejor perfil nutricional"

---

## 10. Logging

| Evento               | Campos                                                                  |
| -------------------- | ----------------------------------------------------------------------- |
| `chat.received`      | `requestId`, `questionLen` (no contenido por privacidad)                |
| `chat.intent_parsed` | `requestId`, `intent.kind`, `intent.categoria`, `tokensIn`, `tokensOut` |
| `chat.retrieved`     | `requestId`, `count`                                                    |
| `chat.no_context`    | `requestId`, `intent.kind`                                              |
| `chat.answered`      | `requestId`, `tokensIn`, `tokensOut`, `latencyMs`                       |
| `chat.failed`        | `requestId`, `error`                                                    |

---

## 11. Tests

**Unit**

- `ChatIntentSchema`: 10 fixtures (filter, info, compare, unknown).
- `retrieve_products` con DB en memoria: cada combinación de filtros del intent.
- Ranking por riesgo+sellos: producto bajo+0 sellos antes que medio+1 sello.

**Integration**

- `POST /api/chat` con DB vacía → respuesta empty con `products: []`.
- `POST /api/chat` con DB seedeada (3 galletitas, 1 apta celíaco) + pregunta "galletitas para celíacos" → 1 producto en respuesta.
- `POST /api/chat` con pregunta inentendible ("contame un chiste") → kind=unknown, mensaje fallback.

**E2E**

- Usuario hace 2 preguntas seguidas → ambas aparecen en el thread.
- Click en chip de producto → navega a detalle.
- "Nueva conversación" limpia el thread.

---

## 12. Decisiones técnicas y trade-offs

| Decisión                                    | Alternativa descartada          | Por qué                                                      |
| ------------------------------------------- | ------------------------------- | ------------------------------------------------------------ |
| Parse intent → SQL filter (sin embeddings)  | búsqueda vectorial              | overkill para MVP con ≤50 productos                          |
| 2 calls al LLM por pregunta                 | 1 sola call                     | aislar parsing de generación, debug más fácil, mejor calidad |
| `temperature=0` en parsing, `0.2` en answer | misma temperatura               | parsing necesita determinismo; answer tolera variedad        |
| Top-K = 5 productos                         | K más grande                    | controlar costo y mantener respuesta enfocada                |
| Conversación en memoria del cliente         | persistir en DB                 | reduce scope; no es objetivo del MVP                         |
| Sin streaming                               | streaming tokens                | scope; respuesta completa es suficiente para 350 tokens      |
| `Phi-4-mini` (text-only) para ambas calls   | `Phi-4-multimodal` (multimodal) | costo menor, no necesitamos imagen para el chat              |

---

## 13. Casos borde

- **Pregunta vacía**: 400 `invalid_question`.
- **Pregunta de >500 chars**: la cortamos a 500 antes de mandarla al parser. Logueamos `chat.truncated`.
- **Intent con `kind=compare` pero solo 1 producto especificado**: `handleChat` normaliza el intent a `kind=info` con esos nombres como `keywords` y sigue el flujo estándar (`normalizeCompareIntent` en `src/lib/chat/handle-chat.ts`).
- **Intent con `kind=compare` y ≥1 producto pedido NO está en historial**: el handler ataja **sin invocar al LLM** y devuelve `fallback.reason = 'missing_compare'` con un mensaje canónico que nombra cada faltante (`"No tengo X guardado, ¿lo querés analizar?"`) + CTA "Analizar nuevo producto". Los productos que SÍ están vuelven igual como chips para navegación. Implementado en `src/lib/chat/compare-helpers.ts` (matching nombre↔producto laxo: case+diacritic insensitive, substring match en ambas direcciones).
- **DB devuelve 0 productos con filtros**: empty response. Si filtros son restrictivos, sugerimos relajarlos en el mensaje fallback (post-MVP).
- **Modelo devuelve respuesta sin disclaimer**: el `sanitize` lo agrega al final.
- **Modelo emite tabla mal-formada en compare (v2)**: el `MarkdownMini` cae a párrafo plano sin romper (no fallamos a 500 por un markdown roto del LLM).

---

## 14. Métricas

- p50/p95 de `parse_intent.latencyMs` y `generate_answer.latencyMs`.
- `chat.no_context_rate` (preguntas sin productos relevantes / total).
- `chat.unknown_intent_rate` (parser falló).
- Tokens promedio por pregunta (in + out).
- Distribución de `intent.kind`.
- `chat.success_rate`.
