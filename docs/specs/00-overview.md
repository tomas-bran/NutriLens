# Overview técnico — NutriLens

> Documento maestro del sistema. Define arquitectura, stack, convenciones cross-cutting y contratos compartidos por todas las épicas. Los specs por épica (`E01`–`E06`) profundizan sobre esta base sin duplicarla.

---

## 1. Arquitectura de alto nivel

```
┌─────────────────┐
│   Frontend      │  Next.js + TypeScript (App Router)
│   (Web SPA/SSR) │  Tailwind + tokens del design system
└────────┬────────┘
         │ HTTP/JSON
┌────────▼────────┐
│   Backend       │  API Routes de Next.js (o Node 20 standalone)
│   (Node 20)     │  Zod para validación de schemas
└────┬───────┬────┘
     │       │
     │       └──────────► Azure AI Foundry (Models-as-a-Service)
     │                    ├── Phi-4-multimodal-instruct (multimodal)
     │                    ├── Phi-4-mini-instruct (text-only)
     │                    └── Azure Document Intelligence (opcional, PDFs)
     │
┌────▼──────────┐
│   Storage     │  SQLite (dev) / Azure Database for PostgreSQL (demo)
│               │  + Azure Blob Storage para imágenes (demo)
└───────────────┘
```

**Plataforma:** todo el stack de IA y backend corre sobre **Azure** usando la cuenta **Azure for Students** ($100 USD de crédito). Esto condiciona varias decisiones técnicas — ver §2.bis.

Decisiones globales:

- **Monorepo en un solo Next.js**: frontend + API Routes en el mismo proyecto. Simplifica deploy y reduce overhead para un MVP de 2 semanas.
- **Sin auth en el MVP**: todos los productos pertenecen a un único "tenant" implícito. Se deja una capa de `userId` opcional para no romper el modelo cuando se agregue auth.
- **TypeScript estricto** (`strict: true`) en frontend y backend.
- **Validación con Zod** en los bordes de la API: nada llega al dominio sin pasar por un schema.
- **Reglas propias por encima del modelo**: el LLM extrae, las reglas clasifican. Nunca confiamos en la clasificación del modelo para aptitud/riesgo.

---

## 2. Stack confirmado

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Frontend | Next.js 14+ (App Router) + TypeScript | SSR para SEO mínimo, CSR para upload/chat |
| Styling | Tailwind CSS + CSS vars (design tokens) | tokens en `/tokens/*.css` |
| Componentes | Custom UI kit en `/components/ui` | basados en wireframes y design system |
| Backend | API Routes de Next.js (Route Handlers) | Node 20 runtime |
| Validación | Zod | schemas compartidos en `/packages/schemas` |
| IA — multimodal | **Phi-4-multimodal-instruct** (Microsoft) via Azure AI Foundry MaaS | analiza imagen/PDF y devuelve JSON estructurado |
| IA — LLM (chat/explicación) | **Phi-4-mini-instruct** (Microsoft) via Azure AI Foundry MaaS | barato para chat RAG y generación de explicación |
| OCR de PDFs (opcional) | **Azure AI Document Intelligence** (prebuilt-read / prebuilt-layout) | solo si el PDF no es procesable directo por Phi-vision |
| Abstracción IA | `IaProvider` con implementación `AzureFoundryProvider` + `MockIaProvider` | un único punto de cambio si migramos de modelo |
| Upgrade path | `gpt-4o` + `gpt-4o-mini` (Azure OpenAI) cuando se apruebe el acceso | mismo `IaProvider`, otra implementación |
| Base de datos | SQLite (dev) → Azure Database for PostgreSQL Flexible Server (demo) | Prisma ORM |
| Storage de imágenes | Filesystem local en dev → **Azure Blob Storage** en demo | container `nutrilens-uploads` |
| Logging | `pino` o `console` estructurado | JSON, una línea por evento |
| Tests | Vitest + Playwright para E2E críticos | foco en reglas y schemas |

---

## 2.bis Azure AI Foundry — plataforma de IA

Estamos sobre **Azure for Students** con **USD 100** de crédito. Todo el procesamiento de IA pasa por **Azure AI Foundry**, que expone tanto **Azure OpenAI** como un **catálogo de modelos de terceros** (Microsoft Phi, Meta Llama, Mistral, etc.) via **Models-as-a-Service (MaaS)**.

> **Decisión activa:** el acceso a `gpt-4o`/`gpt-4o-mini` requiere aprobación de Azure OpenAI Service que aún no tenemos (el modelo aparece en el catálogo pero al desplegarlo Azure dice "no regions available"). Por eso arrancamos con **Phi-4-multimodal-instruct** y **Phi-4-mini-instruct** (Microsoft, disponibles sin trámite para Students). El `IaProvider` permite migrar a GPT-4o cambiando solo una clase cuando llegue la aprobación.

### 2.bis.1 Recursos Azure a aprovisionar

| Recurso Azure | Para qué | Notas |
|--------------|---------|-------|
| **Azure AI Foundry** (hub + project) | Punto de entrada al catálogo de modelos | resource group `rg-nutrilens-ai` |
| **Serverless deployment de `Phi-4-multimodal-instruct`** | Multimodal: extracción imagen→JSON y validación "¿es etiqueta?" | MaaS, pay-per-token |
| **Serverless deployment de `Phi-4-mini-instruct`** | Text-only: chat RAG, parse intent, explicación | MaaS, mucho más barato |
| **Azure AI Document Intelligence** (opcional) | OCR de PDFs si Phi-vision no rinde | activar solo si hace falta |
| **Azure Blob Storage** | Persistencia de imágenes subidas en demo | container `nutrilens-uploads` |
| **Azure Database for PostgreSQL** (Flexible Server, Burstable B1ms) | DB de productos en demo | tier más barato disponible |
| **Azure App Service** (Free F1 o Basic B1) | Hosting del Next.js | F1 alcanza para demo |
| **Application Insights** | Telemetría y logs | plan free |

### 2.bis.2 Modelos seleccionados

| Tarea | Modelo actual (Phi) | Upgrade futuro (Azure OpenAI) |
|------|--------------------|------------------------------|
| Extracción multimodal (imagen/PDF → JSON) | **Phi-4-multimodal-instruct** | `gpt-4o` |
| Validación rápida "¿es etiqueta alimentaria?" | **Phi-4-multimodal-instruct** (misma call/deployment) | `gpt-4o-mini` |
| Explicación en lenguaje simple | **Phi-4-mini-instruct** | `gpt-4o-mini` |
| Parse intent del chat | **Phi-4-mini-instruct** | `gpt-4o-mini` |
| Chat RAG (respuesta final) | **Phi-4-mini-instruct** | `gpt-4o-mini` |
| OCR de PDFs problemáticos | `Document Intelligence prebuilt-read` | igual |

**Notas sobre calidad:** Phi-4-multimodal tiene buena performance en extracción estructurada (ranking competitivo en benchmarks DocVQA) y soporta JSON output via prompting. La validación "¿es etiqueta?" es trivial; la extracción detallada puede requerir prompt más rico (ver E02 §2). Si en pruebas reales vemos que Phi falla, activamos Plan B con Document Intelligence + Phi-mini.

### 2.bis.3 Configuración mínima del cliente (Phi via Azure AI Inference SDK)

Los modelos de Foundry no-OpenAI se consumen con el SDK **`@azure-rest/ai-inference`**, que expone un endpoint compatible con el shape de chat completions de OpenAI pero apuntando a la URL del serverless deployment.

```ts
// lib/ai/foundry.ts
import ModelClient from '@azure-rest/ai-inference';
import { AzureKeyCredential } from '@azure/core-auth';

// Un cliente por modelo (cada deployment serverless tiene su URL).
export const visionClient = ModelClient(
  process.env.AZURE_FOUNDRY_PHI4_MM_ENDPOINT!,
  new AzureKeyCredential(process.env.AZURE_FOUNDRY_PHI4_MM_KEY!),
);

export const miniClient = ModelClient(
  process.env.AZURE_FOUNDRY_PHI4_MINI_ENDPOINT!,
  new AzureKeyCredential(process.env.AZURE_FOUNDRY_PHI4_MINI_KEY!),
);
```

Variables de entorno requeridas (en `.env.local`, **nunca commiteadas**):

```
# Provider de IA: foundry (Phi) o azure-openai (gpt-4o) o mock
IA_PROVIDER=foundry

# Phi-4-multimodal-instruct (serverless deployment)
AZURE_FOUNDRY_PHI4_MM_ENDPOINT=https://<resource>.<region>.models.ai.azure.com
AZURE_FOUNDRY_PHI4_MM_KEY=...

# Phi-4-mini-instruct (serverless deployment)
AZURE_FOUNDRY_PHI4_MINI_ENDPOINT=https://<resource>.<region>.models.ai.azure.com
AZURE_FOUNDRY_PHI4_MINI_KEY=...

# Opcional: cuando se apruebe Azure OpenAI, se completan estos y se cambia IA_PROVIDER=azure-openai
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_API_VERSION=2024-10-21
AZURE_OPENAI_DEPLOYMENT_GPT4O=
AZURE_OPENAI_DEPLOYMENT_GPT4O_MINI=

# Opcional: Document Intelligence
AZURE_DOCINTEL_ENDPOINT=
AZURE_DOCINTEL_KEY=

# Demo
AZURE_BLOB_CONNECTION_STRING=
```

### 2.bis.4 Presupuesto y guardrails de costo

El crédito de $100 USD impone disciplina. Reglas de diseño:

- **Cachear extracciones por hash de imagen**: si el mismo archivo se sube dos veces no se vuelve a llamar al modelo (ya estaba en el plan E04 — acá se vuelve obligatorio).
- **Caché de explicaciones** por `(productId, promptVersion)`: si la entrada no cambia, no regeneramos.
- **`Phi-4-mini-instruct` por defecto** para todo lo que no sea extracción visual.
- **Truncar prompts del chat** a los top-K (K = 5) productos del retrieval.
- **Timeouts agresivos**: 25 s para extracción, 10 s para chat. Más allá de eso, error controlado (ahorra tokens si el modelo se queda colgado).
- **Azure Budget Alert** en el portal: notificación al 50% / 80% / 95% del consumo.
- **Mock provider para CI/tests**: nunca se gasta crédito desde la pipeline.

### 2.bis.5 Estimación gruesa de costos (referencia)

Phi-4 vía Foundry MaaS es **~10x más barato** que GPT-4o (precio público al momento: ~$0.0001 / 1k tokens input para Phi-4-mini, ~$0.001 / 1k tokens para Phi-4-multimodal con imagen).

| Acción | Modelo | Tokens aprox | Costo aprox (USD) |
|--------|--------|-------------|-------------------|
| 1 extracción (1 imagen ~1024x1024) | Phi-4-multimodal | ~1500 in + 500 out | ~$0.002 |
| 1 explicación | Phi-4-mini | ~500 in + 200 out | ~$0.00005 |
| 1 consulta chat RAG (parse + answer) | Phi-4-mini | ~2500 in + 500 out | ~$0.0001 |

Con $100 USD el techo teórico es enorme (>40k extracciones). La amenaza real sigue siendo dejar un loop infinito o un test que no usa el mock. Mantenemos los guardrails y el budget alert.

### 2.bis.6 Despliegue

- **Frontend + API:** Azure App Service (Linux, Node 20), un único Web App.
- **DB:** Azure Database for PostgreSQL Flexible Server, tier B1ms, con firewall rule para App Service.
- **Blob:** un Storage Account con un container privado, las URLs se firman desde el backend.
- **Foundry:** queda en su propia resource group `rg-nutrilens-ai`.

> Decisión: el deploy en Azure no es bloqueante para el MVP — el equipo puede desarrollar 100% en local (`mock` provider + SQLite) y solo "encender" Azure cuando esté la demo lista.

---

## 3. Estructura de carpetas propuesta

```
nutrilens/
├── app/                       Next.js App Router
│   ├── (marketing)/page.tsx   landing/inicio
│   ├── analizar/              upload + resultado
│   ├── historial/             historial + filtros
│   ├── historial/[id]/        detalle
│   ├── chat/                  chat RAG
│   └── api/
│       ├── analyze/route.ts
│       ├── products/route.ts
│       ├── products/[id]/route.ts
│       └── chat/route.ts
├── components/
│   ├── ui/                    botones, cards, badges
│   ├── upload/                componente de upload + estados
│   ├── result/                vista de análisis procesado
│   ├── history/               lista + filtros
│   └── chat/                  mensajes + chips
├── lib/
│   ├── ai/                    IaProvider + prompts versionados
│   ├── rules/                 reglas de aptitud y riesgo
│   ├── pipeline/              orquestador del análisis
│   ├── db/                    prisma client
│   └── logging.ts
├── packages/schemas/          Zod schemas compartidos
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── tokens/                    CSS vars del design system
├── uploads/                   imágenes subidas (gitignored)
└── tests/
```

---

## 4. Convenciones de API

### 4.1 Formato de error estructurado

Todas las respuestas de error de la API siguen el mismo shape:

```json
{
  "error": "image_not_supported",
  "reason": "La imagen no parece corresponder a una etiqueta alimentaria.",
  "details": {
    "confidence": 0.32
  }
}
```

- `error`: código `snake_case` enumerable (no traducido).
- `reason`: mensaje en español listo para mostrar al usuario.
- `details`: objeto opcional con datos extra para debugging/UI avanzada.

Códigos de error reservados (ver épicas para los específicos):

| Código | HTTP | Cuándo |
|--------|------|--------|
| `unsupported_file_type` | 400 | MIME no permitido |
| `file_too_large` | 400 | Excede 10 MB |
| `pdf_unreadable` | 400 | PDF dañado o sin texto/imagen |
| `image_not_supported` | 422 | No parece etiqueta alimentaria |
| `extraction_invalid` | 422 | Salida del modelo no cumple schema |
| `model_timeout` | 504 | El modelo no respondió a tiempo |
| `model_rate_limited` | 429 | El proveedor devolvió 429 |
| `model_error` | 502 | Otro error del proveedor |
| `not_found` | 404 | Recurso inexistente |
| `internal_error` | 500 | Cualquier otra cosa |

### 4.2 Headers obligatorios

- Request: `Content-Type` apropiado (`multipart/form-data` para uploads, `application/json` para el resto).
- Response: `Content-Type: application/json`; `X-Request-Id` con un UUID por request (para correlacionar logs).

### 4.3 Versionado de la API

- Sin prefijo `/v1` para el MVP (todo bajo `/api/*`).
- Cualquier cambio breaking se hace en `/api/v2/*` para no romper builds anteriores.

---

## 5. Pipeline del análisis (modelo conceptual)

```
[Archivo] → validate_file → detect_label_kind → extract_with_ia
        → validate_schema → apply_rules → compute_risk
        → generate_explanation → persist → respond
```

Cada step es una función pura `(ctx) => ctx` que va acumulando datos en un `AnalysisContext`. Se loguean los tiempos por step y se almacenan en el JSON del producto bajo `pipeline_trace` para la UI (ver E06).

```ts
type AnalysisContext = {
  requestId: string;
  startedAt: string;
  file: { name: string; mime: string; sizeBytes: number; hash: string };
  steps: StepTrace[];
  product?: ProductExtraction;  // resultado del paso de extracción
  rules?: RulesResult;          // resultado del paso de reglas
  explanation?: string;
  error?: ApiError;
};

type StepTrace = {
  name: 'validate_file' | 'detect_label_kind' | 'extract_with_ia' | 'validate_schema'
      | 'apply_rules' | 'compute_risk' | 'generate_explanation' | 'persist';
  status: 'ok' | 'skipped' | 'error';
  durationMs: number;
  details?: Record<string, unknown>;
};
```

---

## 6. Schema canónico del producto

Compartido entre IA, backend y frontend (Zod source of truth):

```ts
// packages/schemas/product.ts
import { z } from 'zod';

export const ProductExtractionSchema = z.object({
  producto: z.string().min(1),
  categoria: z.enum([
    'galletitas', 'cereales', 'snacks', 'lácteos', 'bebidas',
    'sin TACC', 'veganos', 'otros',
  ]),
  ingredientes_detectados: z.array(z.string()).default([]),
  alergenos: z.array(z.string()).default([]),
  sellos: z.array(z.string()).default([]),
  apto_vegano: z.boolean(),
  apto_celiaco: z.boolean(),
  apto_sin_lactosa: z.boolean(),
  riesgo: z.enum(['bajo', 'medio', 'alto']),
  confidence: z.number().min(0).max(1),
});

export type ProductExtraction = z.infer<typeof ProductExtractionSchema>;
```

El producto persistido extiende este shape con metadata (ver E04):

```ts
export const SavedProductSchema = ProductExtractionSchema.extend({
  id: z.string().uuid(),
  imagenPath: z.string(),         // path relativo en /uploads
  jsonRaw: z.string(),            // raw output del modelo (para debugging)
  createdAt: z.string().datetime(),
  pipelineTrace: z.array(StepTraceSchema).optional(),
});
```

---

## 7. Manejo de IA — abstracción del proveedor

```ts
// lib/ai/provider.ts
export interface IaProvider {
  analyzeLabel(file: Buffer, mime: string, opts: { promptVersion: string }):
    Promise<{ raw: string; usage: TokenUsage; latencyMs: number }>;
  generateExplanation(product: ProductExtraction, opts: { promptVersion: string }):
    Promise<{ text: string; usage: TokenUsage; latencyMs: number }>;
  answerWithContext(question: string, products: SavedProduct[], opts: { promptVersion: string }):
    Promise<{ text: string; usage: TokenUsage; latencyMs: number }>;
}
```

Implementaciones:

- **`FoundryPhi4Provider`** (default actual): usa `@azure-rest/ai-inference`, modelos `Phi-4-multimodal-instruct` y `Phi-4-mini-instruct` via MaaS endpoints separados.
- **`AzureOpenAIProvider`** (upgrade futuro, cuando se apruebe el acceso): usa `openai` SDK con base URL Azure, modelos `gpt-4o` y `gpt-4o-mini`.
- **`MockIaProvider`** (default en `dev` y CI): devuelve respuestas fijas a partir de fixtures en `/tests/fixtures/ai`. No consume crédito.

Reglas comunes:

- Prompts viven en `/lib/ai/prompts/{name}-v{N}.md` y se versionan junto al código. **El mismo prompt funciona para Phi y para GPT-4o** (con ajustes menores documentados en los specs por épica).
- Cada call loguea: `provider`, `model`, `promptVersion`, `tokensIn`, `tokensOut`, `latencyMs`, `requestId`.
- Provider configurable por `IA_PROVIDER` env var (`foundry` | `azure-openai` | `mock`).
- Si el endpoint devuelve `429` o `5xx`, el provider hace **un único reintento** con backoff de 2 s y después falla con `model_rate_limited` / `model_error`.
- Si el modelo devuelve un JSON que no parsea, el provider devuelve el `raw` igual — la validación de schema queda en el caller (ver E02).
- Phi no soporta `response_format: json_object` nativo; lo forzamos con prompt + parsing tolerante a fences ` ```json … ``` `.

---

## 8. Logging y observabilidad

- Una línea JSON por evento, campos mínimos:
  ```json
  {"ts":"...","level":"info","event":"analyze.completed","requestId":"...","durationMs":1432,"riesgo":"alto"}
  ```
- Eventos clave: `analyze.started`, `analyze.completed`, `analyze.failed`, `chat.answered`, `chat.no_context`, `rule.applied`, `model.error`.
- Sin PII en logs. La imagen subida nunca se loguea (solo su hash).

---

## 9. Seguridad y datos sensibles

- Sin auth en MVP → no se persisten datos personales.
- Imágenes guardadas con nombre derivado del hash, no del usuario.
- Variables de entorno sensibles (`OPENAI_API_KEY`, etc.) **nunca** se commitean. `.env.local` está gitignored.
- Disclaimers de "no es consejo médico" obligatorios en resultado y chat (ver E03).

---

## 10. Entornos

| Entorno | DB | Storage | Modelo IA | Notas |
|---------|----|---------|----------|-------|
| `dev` (local) | SQLite local | `/uploads` | `mock` o `openai` con quota baja | seed con 20-40 productos |
| `demo` (TP) | SQLite con seed | `/uploads` | proveedor real con caching local | foco en estabilidad para la presentación |
| `prod` (futuro) | Postgres | S3/Blob | proveedor real | fuera del MVP |

---

## 11. Tests mínimos del MVP

| Tipo | Cobertura |
|------|----------|
| Unit | reglas de aptitud, fórmula de riesgo, validación de schema |
| Integration | endpoint `/api/analyze` con `MockIaProvider` |
| E2E (Playwright) | flujo completo: upload → resultado → historial → chat |
| Snapshot | output del prompt de explicación sobre un set fijo de inputs |

---

## 12. Glosario

- **MVP**: Producto Mínimo Viable.
- **RAG**: Retrieval-Augmented Generation — buscar info y usarla como contexto.
- **LLM**: Large Language Model.
- **OCR**: Optical Character Recognition.
- **IA multimodal**: modelo que acepta más de un tipo de input (imagen + texto).
- **Aptitud**: clasificación binaria de un producto para vegano/celíaco/sin lactosa.
- **Riesgo**: clasificación trinaria (bajo/medio/alto) calculada por reglas propias.
- **Confidence**: score `[0, 1]` reportado por el modelo de extracción.
