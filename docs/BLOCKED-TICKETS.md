# NutriLens — Tickets bloqueados: qué necesitás hacer para desbloquearme

> **Actualizado 2026-06-12** — La infra Azure base **ya está toda viva** (DB,
> Blob, App Service, budget) y la app corre en producción:
> **https://nutrilens-app.azurewebsites.net**. Este doc queda enfocado en lo
> que sigue bloqueado por decisiones/acciones humanas.

---

## Estado de PRs

| Estado       | PRs                                                                                                                                                                                                                                          |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅ Mergeados | #1 markdown chat · #2 audit · #3 paste imagen · #4 pills contextuales · #5 timeout · #10 coverage · #11 docs · #12 warnings build/CI · #13 runtime Linux + guía deploy · #14 prompts v3 · #15 Blob Storage                                   |
| 🔵 Abiertos  | #6 Open Food Facts (CI verde, rebasear contra main: conflicto conocido en `analyze/route.ts` y reemplaza `src/lib/enrichment/` por `src/lib/off/`) · #7 historial de chats · #8 health ranking (corregido, listo) · #9 veredicto comparación |

---

## GRUPO 1 — Infraestructura Azure base ✅ COMPLETO

Todo provisionado en la suscripción Azure for Students (cuenta de tomi):

| Recurso                       | Detalle                                                                                                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL (NL-101 / AB#61)   | `nutrilens-db` en **northcentralus** (única región que la suscripción permite para Postgres Flexible), B1ms free 12 meses, **pgvector habilitado**, migraciones + seed aplicados |
| Blob Storage (NL-102 / AB#62) | `nutrilensimg` + container privado `uploads`. Implementado en PR #15: key en DB + SAS presigned de 1 h al servir                                                                 |
| App Service (NL-801 / AB#82)  | `nutrilens-app`, plan F1 gratis, NODE:22-lts, standalone                                                                                                                         |
| Env vars (NL-802 / AB#83)     | Todas cargadas en App Settings (IA, DB, Blob, HOSTNAME)                                                                                                                          |
| Budget (NL-104 / AB#64)       | $20/mes con alertas 80%/100% a federicoamartucci@gmail.com                                                                                                                       |

**Dónde sale `AZURE_BLOB_CONNECTION_STRING`** (por si hay que rotarla o usarla
en local): portal → storage account `nutrilensimg` → _Access keys_ → Connection
string, o `az storage account show-connection-string -g nutrilens-rg -n
nutrilensimg`. Es variable de **runtime** (App Settings de la webapp + `.env.local`
para dev) — **no** va en los GitHub secrets: el workflow de deploy no la necesita.

---

## NL-103 → Auth: ✅ DECIDIDO — Login con Google

Decisión 2026-06-12: **NextAuth (Auth.js) con Google como provider** (sin
email/password propio). Implementación: NL-201 (login) + NL-202 (rutas
protegidas) + NL-203 (datos por usuario).

**Lo único que necesito de vos** — credenciales OAuth de Google:

1. [console.cloud.google.com](https://console.cloud.google.com) → crear proyecto
   (o usar uno existente) → **APIs & Services → Credentials → Create
   Credentials → OAuth client ID** (tipo _Web application_).
2. Si pide configurar la pantalla de consentimiento: tipo _External_, modo
   testing alcanza (agregar los emails del equipo como test users).
3. **Authorized redirect URIs** (las dos):
   - `http://localhost:3000/api/auth/callback/google`
   - `https://nutrilens-app.azurewebsites.net/api/auth/callback/google`
4. Pasame el **Client ID** y el **Client Secret** → yo cargo
   `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` / `AUTH_SECRET` en App Settings y
   `.env.local`, e implemento las tres stories en una branch.

---

## GRUPO 3 — RAG vectorial (NL-401, NL-402, NL-404)

**Infra desbloqueada** (pgvector ya habilitado en la DB). Falta:

1. **Confirmar el modelo de embeddings** disponible en el recurso Azure OpenAI
   (`tbranchesi-7722-resource`): ideal un deployment de `text-embedding-3-small`.
   Si no está deployado, crearlo desde Azure AI Foundry → Deployments.
2. **NL-404 — Golden set**: 10-15 pares pregunta → productos esperados, en
   cualquier formato. Sigue pendiente de Federico.

---

## GRUPO 4 — Deploy ✅ (workflow agregado en este PR)

- NL-801/802: ✅ (ver GRUPO 1).
- **NL-803 (AB#84)**: los secrets `AZURE_WEBAPP_PUBLISH_PROFILE` y
  `DATABASE_URL` ya están cargados en GitHub. El workflow
  `.github/workflows/deploy.yml` entra con este PR — **a partir de su merge,
  cada push a main deploya solo** (más `workflow_dispatch` para correrlo a
  mano desde la pestaña Actions). Incluye migraciones pre-deploy y smoke test
  post-deploy con reintentos por el cold start de F1.

> Nota histórica: "el deploy no corría al mergear PRs" era simplemente que el
> workflow nunca se había agregado al repo — estaba esperando los secrets.

---

## GRUPO 5 — Calidad y cierre académico

- **NL-901 (coverage 80%)**: ✅ mergeado (PR #10).
- **NL-902 (informe técnico)**: necesito tus respuestas — qué fue lo más
  difícil, qué cambiarías, qué aprendiste de IA generativa, qué quedó afuera.
- **NL-903 (presentación + demo)**: duración, audiencia, ¿slides o solo guion?
- **NL-904 (seed demo)**: hay 50 productos. ¿Alcanza o querés productos
  argentinos reales puntuales?

---

## NL-701 — Comparación lado a lado

Sigue pendiente tu decisión: **(A)** la comparación del chat (tabla + veredicto
del PR #9) alcanza y cerramos el ticket, o **(B)** querés la página `/comparar`
dedicada con selector visual.

---

## Resumen de acciones en orden

| Prioridad | Acción                                             | Desbloquea                      |
| --------- | -------------------------------------------------- | ------------------------------- |
| 1         | Mergear este PR (workflow de deploy)               | Deploy automático en cada merge |
| 2         | Mergear #8 y #9; rebasear y mergear #6 y #7        | Cierre del backlog de features  |
| 3         | Crear OAuth client de Google y pasarme ID + Secret | NL-201/202/203 (auth)           |
| 4         | Confirmar modelo de embeddings en Azure OpenAI     | NL-401/402 (RAG)                |
| 5         | Golden set (10-15 pares)                           | NL-404                          |
| 6         | Decisión A/B de NL-701                             | NL-701                          |
| 7         | Respuestas para informe + datos de presentación    | NL-902/903                      |
