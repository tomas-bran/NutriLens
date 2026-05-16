# Specs SDD — NutriLens

> Documentos de Spec-Driven Development. Cada épica del backlog tiene su spec técnico con contratos de API, schemas, decisiones y trade-offs. La implementación arranca a partir de estos documentos.

---

## Estructura

```
docs/specs/
├── README.md                              ← este índice
├── 00-overview.md                         ← arquitectura, stack, convenciones cross-cutting
├── E01-onboarding-y-upload.md             ← upload, validación, estados
├── E02-analisis-multimodal-ia.md          ← prompt + schema + IA provider (Azure AI Foundry)
├── E03-clasificacion-reglas-explicacion.md ← reglas propias, riesgo, explicación
├── E04-persistencia-e-historial.md        ← DB, endpoints de productos, filtros
├── E05-chat-rag.md                        ← chat con RAG sobre el historial
└── E06-pipeline-observable-y-ux.md        ← pipeline visible, JSON viewer, design system, seed
```

---

## Cómo leer estos specs

1. **Empezar por `00-overview.md`** — contiene la arquitectura, stack confirmado (Azure AI Foundry), modelos elegidos (`Phi-4-multimodal-instruct` + `Phi-4-mini-instruct`, con `gpt-4o` como upgrade path), schema canónico del producto y convenciones de error.
2. Cada spec por épica **referencia** el overview en vez de duplicarlo.
3. Los specs declaran qué user stories cubren (referencias `US-XX`) y qué pantallas de los wireframes implementan.
4. Cada spec termina con secciones de **decisiones técnicas + trade-offs**, **casos borde** y **métricas** para no quedarnos solo con el "qué" — incluye el "por qué".

---

## Mapa épica → spec → user stories

| Épica | Spec | User stories | Foco |
|-------|------|--------------|------|
| E01 | [`E01-onboarding-y-upload.md`](./E01-onboarding-y-upload.md) | US-01 a US-07 | Upload + validación + clasificación rápida |
| E02 | [`E02-analisis-multimodal-ia.md`](./E02-analisis-multimodal-ia.md) | US-08 a US-15 | Endpoint `/api/analyze`, prompt, schema, IA |
| E03 | [`E03-clasificacion-reglas-explicacion.md`](./E03-clasificacion-reglas-explicacion.md) | US-16 a US-20 | Reglas propias, riesgo, explicación, disclaimers |
| E04 | [`E04-persistencia-e-historial.md`](./E04-persistencia-e-historial.md) | US-21 a US-26 | DB Prisma, endpoints, filtros, detalle |
| E05 | [`E05-chat-rag.md`](./E05-chat-rag.md) | US-27 a US-32 | Chat, retrieval, generación con contexto |
| E06 | [`E06-pipeline-observable-y-ux.md`](./E06-pipeline-observable-y-ux.md) | US-33 a US-39 | Pipeline visible, JSON viewer, design system, seed |

---

## Stack final (consolidado del overview)

- **Frontend:** Next.js 14+ (App Router) + TypeScript + Tailwind + design tokens CSS.
- **Backend:** API Routes de Next.js (Node 20) + Zod.
- **IA:** Azure AI Foundry (MaaS) — `Phi-4-multimodal-instruct` (extracción multimodal) + `Phi-4-mini-instruct` (clasificación rápida, chat, explicación). Upgrade path documentado a `gpt-4o` + `gpt-4o-mini` cuando se apruebe el acceso a Azure OpenAI.
- **DB:** SQLite (dev) → Azure Database for PostgreSQL (demo) via Prisma.
- **Storage:** filesystem `/uploads` (dev) → Azure Blob Storage (demo).
- **Hosting demo:** Azure App Service Linux Node 20.
- **Observabilidad:** logging JSON estructurado + Application Insights (demo).
- **Tests:** Vitest (unit + integration) + Playwright (E2E críticos).

---

## Provider de IA

```
IaProvider
├── AzureFoundryProvider   ← demo/prod
└── MockIaProvider         ← dev/CI (default, sin gastar tokens)
```

Switch por env var `IA_PROVIDER=azure|mock`. Detalles en `00-overview.md` §7 y `E02 §7`.

---

## Variables de entorno

Template completo en `.env.example` en la raíz del repo. Mínimas para arrancar:

```bash
# Dev sin Azure
IA_PROVIDER=mock

# Demo con Azure
IA_PROVIDER=azure
AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_DEPLOYMENT_GPT4O=nutrilens-gpt4o
AZURE_OPENAI_DEPLOYMENT_GPT4O_MINI=nutrilens-gpt4o-mini
```

---

## Recursos Azure a aprovisionar

| Recurso | Para qué | Spec |
|---------|---------|------|
| Azure AI Foundry hub + project | Catálogo de modelos, governance | overview §2.bis |
| Serverless deployment `Phi-4-multimodal-instruct` | Extracción multimodal + clasificación rápida | E01, E02 |
| Serverless deployment `Phi-4-mini-instruct` | Chat RAG, parse intent, explicación | E03, E05 |
| Document Intelligence (opcional) | OCR de PDFs problemáticos | E02 §10 |
| Azure Database for PostgreSQL | Persistencia en demo | E04 §2 |
| Azure Blob Storage | Imágenes en demo | E04 §4 |
| Azure App Service | Hosting del Next.js | overview §2.bis.6 |
| Application Insights | Telemetría | overview §8 |
| Budget Alert | Guardrail de costo | overview §2.bis.4 |

Detalle de regiones y disponibilidad en `00-overview.md`.

---

## Próximos pasos

1. **Implementación**: arrancar por las tareas P0 del backlog (`docs/backlog/`).
2. **Validar prompts contra fixtures reales** (E02 §12 — snapshot tests).
3. **Aprovisionar Azure** cuando el equipo de demo lo necesite (recursos de §arriba).
4. **Iterar prompts** versionando: `extract_product-v2`, `explain_product-v2`, etc.

---

## Convenciones de versionado de prompts

- Cada prompt vive en `lib/ai/prompts/{name}-v{N}.md`.
- Cuando se cambia, se incrementa `N` y se actualiza la versión en la llamada al provider.
- Los productos persistidos guardan `promptVersion` para trazabilidad (E02, E04).
- Los snapshots de tests se atan a una versión específica.
