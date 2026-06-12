# NutriLens — Tickets bloqueados: qué necesitás hacer para desbloquearme

> **Actualizado 2026-06-09** — Stack migrada de AWS a **Azure** usando el crédito de $100 de Azure for Students (la misma suscripción que ya usás para Azure DevOps). Sin costos fuera del crédito para el TP.

---

## Resumen de PRs ya abiertos (mergear cuando CI esté verde)

| PR  | Branch                            | Tickets                  |
| --- | --------------------------------- | ------------------------ |
| #1  | `feat/NL-303-markdown-chat`       | NL-303 — **CI verde ✅** |
| #3  | `chore/audit-2026-05`             | audit — **CI verde ✅**  |
| #4  | `feat/NL-502-sidebar-fijo`        | NL-502                   |
| #5  | `feat/NL-501-paste-image`         | NL-501                   |
| #6  | `feat/NL-503-suggestion-pills`    | NL-503                   |
| #7  | `feat/US-39-timeout-fallback`     | US-39 (AB#45)            |
| #8  | `feat/NL-601-602-open-food-facts` | NL-601, NL-602           |
| #9  | `feat/NL-301-302-chat-history`    | NL-301, NL-302           |
| #10 | `feat/NL-403-health-ranking`      | NL-403                   |
| #11 | `feat/NL-702-compare-verdict`     | NL-702                   |
| #13 | `feat/NL-901-coverage-gate`       | NL-901                   |

---

## Stack Azure (reemplaza AWS, usa el crédito student)

| Servicio                   | Azure equivalente                                     | Costo estimado                 |
| -------------------------- | ----------------------------------------------------- | ------------------------------ |
| Base de datos + pgvector   | Azure Database for PostgreSQL Flexible Server (B1ms)  | **Gratis 12 meses** → ~$12/mes |
| Almacenamiento de imágenes | Azure Blob Storage                                    | **~$0.02/GB/mes**              |
| Hosting Next.js            | Azure App Service F1                                  | **Gratis para siempre**        |
| Autenticación              | NextAuth.js con email/password (sin servicio externo) | **$0**                         |

Con el crédito de $100 tenés ~8 meses post-free-tier. Para el TP el gasto total es $0.

---

## GRUPO 1 — Infraestructura Azure base (NL-101, NL-102, NL-103, NL-104)

**Por qué me bloquea:** Los grupos 3 y 4 (pgvector RAG + deploy) dependen de esto.

### 1a. Activar la suscripción Azure for Students

1. Ir a [azure.microsoft.com/free/students](https://azure.microsoft.com/free/students)
2. Loguearte con tu email universitario (el mismo que usás en Azure DevOps, `fmartucci@alumno.unlam.edu.ar`)
3. Verificar que aparece el crédito de $100. Si ya lo usaste, la cuenta gratuita de Azure igualmente tiene F1 + storage free forever.
4. Anotame tu **Subscription ID** (lo ves en "Subscriptions" en el portal de Azure).

### 1b. NL-101 — Base de datos PostgreSQL con pgvector (AB#61)

```bash
# Instalá Azure CLI si no lo tenés
brew install azure-cli

# Login
az login

# Creá un resource group
az group create --name nutrilens-rg --location eastus

# Creá el servidor PostgreSQL (B1ms = free tier 12 meses)
az postgres flexible-server create \
  --name nutrilens-db \
  --resource-group nutrilens-rg \
  --location eastus \
  --admin-user nutrilens \
  --admin-password <TU_PASSWORD> \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16

# Habilitá acceso desde tu IP (o desde Azure services)
az postgres flexible-server firewall-rule create \
  --name allow-azure-services \
  --resource-group nutrilens-rg \
  --server-name nutrilens-db \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

Conectate y habilitá pgvector:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**Me anotás:**

- `host`: `nutrilens-db.postgres.database.azure.com`
- `database`: `postgres` (o el nombre que elijas)
- `user`: `nutrilens`
- `password`: el que pusiste arriba

### 1c. NL-102 — Blob Storage para imágenes (AB#62)

```bash
# Creá una storage account
az storage account create \
  --name nutrilensstorage \
  --resource-group nutrilens-rg \
  --location eastus \
  --sku Standard_LRS

# Creá el container
az storage container create \
  --name uploads \
  --account-name nutrilensstorage \
  --public-access blob

# Obtenés la connection string
az storage account show-connection-string \
  --name nutrilensstorage \
  --resource-group nutrilens-rg
```

**Me anotás:** la `connection string` completa (empieza con `DefaultEndpointsProtocol=https;AccountName=...`).

### 1d. NL-103 — Auth (AB#63)

**No necesitás Cognito ni Azure AD B2C.** Usamos NextAuth.js con email/password, que corre dentro de la misma app Next.js. No requiere ningún servicio externo y es $0.

Solo necesitás elegir:

- **Opción A**: Solo el equipo del TP puede registrarse (yo agrego los emails hardcodeados al seed).
- **Opción B**: Registro abierto con email de confirmación (necesitaría un servicio SMTP, ej. Resend.com que tiene 3,000 emails/mes gratis).

**Me avisás cuál preferís.** En cuanto confirmes, implemento login en una sola branch sin dependencia de Azure.

### 1e. NL-104 — Guardia de costo (AB#64)

En el portal de Azure → **Cost Management + Billing** → **Budget alerts**:

- Creá un budget de **$20/mes** con alerta al 80% ($16) y al 100% ($20).
- Email: el tuyo.

Esto garantiza que nunca gastás más de $20/mes (y con el free tier lo más probable es $0).

**Una vez que me des los datos de 1b y 1c:**

- Actualizo `.env.example` y la lógica de storage para Azure Blob.
- Implemento NL-201/202/203 (auth + rutas protegidas + modelo multi-usuario).
- Branch: `feat/NL-201-203-auth`

---

## GRUPO 2 — Multi-usuario (NL-201, NL-202, NL-203)

**Depende de:** Decisión de auth (1d) — no requiere Azure, solo tu elección de Opción A/B.

**Lo que implemento:**

- `NL-201`: Pantalla de registro/login con NextAuth.js
- `NL-202`: Middleware que protege `/analizar`, `/historial`, `/chat`
- `NL-203`: Columna `userId` en `Product` y `Conversation` → cada usuario ve solo sus datos

**NL-302 nota:** El `// TODO NL-201` en el route handler de conversaciones se conecta solo en esta branch.

**Acción tuya:** Solo decirme Opción A o B de auth (ver 1d arriba).

---

## GRUPO 3 — RAG vectorial con pgvector (NL-401, NL-402, NL-404)

**Depende de:** GRUPO 1 (base de datos Azure con pgvector).

**NL-401 — Embeddings al guardar (AB#71):**
Cuando se persiste un producto, genero su embedding y lo guardo en `embedding vector(1536)`. Para los embeddings uso el mismo Azure AI Foundry que ya tenés configurado — el modelo `text-embedding-ada-002` o el que tengas disponible en tu endpoint.

**NL-402 — Retrieval semántico (AB#72):**
En el chat, la búsqueda por similaridad coseno reemplaza/complementa el filtro por texto actual.

**NL-404 — Golden set para evaluar el RAG (AB#74):**
Necesito que armes 10-15 pares en un JSON con este formato:

```json
[
  {
    "pregunta": "¿Qué galletitas son aptas para celíacos?",
    "productos_esperados": ["Galletitas Sin TACC Maíz", "Oblea Arroz"]
  }
]
```

**Pasos que necesito de vos:**

1. Completar GRUPO 1 (DB con pgvector).
2. Confirmar qué modelo de embeddings tenés en Azure AI Foundry (o si podés habilitarlo).
3. Para NL-404: mandame los pares en cualquier formato.

---

## GRUPO 4 — Deploy en Azure (NL-801, NL-802, NL-803)

**Depende de:** GRUPO 1 completo.

### NL-801 — Deploy en Azure App Service (AB#82)

```bash
# Creá el App Service plan (F1 = gratis para siempre)
az appservice plan create \
  --name nutrilens-plan \
  --resource-group nutrilens-rg \
  --sku F1 \
  --is-linux

# Creá la web app con Node.js
az webapp create \
  --name nutrilens-app \
  --resource-group nutrilens-rg \
  --plan nutrilens-plan \
  --runtime "NODE:20-lts"
```

La URL queda como `https://nutrilens-app.azurewebsites.net`.

**Me anotás:** la URL final.

### NL-802 — Variables de entorno en producción (AB#83)

En el portal Azure → App Service → **Configuration** → **Application settings**, agregás:

```
DATABASE_URL=postgresql://nutrilens:<password>@nutrilens-db.postgres.database.azure.com:5432/postgres?sslmode=require
AZURE_STORAGE_CONNECTION_STRING=<la de 1c>
AZURE_AI_FOUNDRY_ENDPOINT=<la que ya tenés>
AZURE_AI_FOUNDRY_KEY=<la que ya tenés>
IA_PROVIDER=foundry
NEXTAUTH_SECRET=<string random de 32 chars>
NEXTAUTH_URL=https://nutrilens-app.azurewebsites.net
```

### NL-803 — CI/CD automático desde GitHub (AB#84)

En el portal Azure → App Service → **Deployment Center** → seleccionás GitHub → repo `fede-martucci/NutriLens` → branch `main`. Azure genera automáticamente el workflow `.github/workflows/azure-deploy.yml`.

Después agregás los secrets en GitHub Actions (`Settings → Secrets → Actions`):

```
AZURE_WEBAPP_PUBLISH_PROFILE   ← lo descargás desde Azure App Service → Overview → Get publish profile
DATABASE_URL                   ← la de producción
```

**Pasos concretos para desbloquearme:**

1. Completar GRUPO 1.
2. Correr los comandos de NL-801.
3. Setear las variables de NL-802.
4. Conectar el deploy en NL-803.
5. Confirmarme la URL.

---

## GRUPO 5 — Calidad y cierre académico (NL-901, NL-902, NL-903, NL-904)

### NL-901 — Tests al 80% (AB#85)

**Estado:** PR #13 ya abierto, coverage actual en main = **91.66% lines / 94.54% branches** — gate pasa. Cuando mergees los PRs abiertos, corro coverage combinado y ajusto si algo baja.

**Acción tuya:** Mergear los PRs → decirme "ya mergeé" → yo verifico.

### NL-902 — Informe técnico final (AB#86)

**Necesita tu voz.** Puedo estructurarlo y redactarlo si me das los puntos:

1. ¿Qué fue lo más difícil del proyecto?
2. ¿Qué cambiarías si lo empezaras de nuevo?
3. ¿Qué aprendiste de IA generativa aplicada?
4. ¿Qué features quedaron fuera y por qué?

Con eso te armo el informe completo en `docs/presentation/`.

### NL-903 — Presentación oral + guion de demo (AB#87)

**Necesita tu input.** Decime:

1. Duración (¿15 minutos? ¿30?).
2. Audiencia (¿docentes de UNLaM, evaluadores externos, empresa?).
3. ¿Querés slides en PDF/PowerPoint, o solo el guion de demo en vivo?

### NL-904 — Seed de datos para demo pública (AB#88)

**Implementable por mí.** El seed actual tiene 50 productos. Solo decime:

1. ¿Está bien 50 o querés más/menos?
2. ¿Hay algún producto real de supermercado argentino que quieras mostrar específicamente?

---

## NL-701 — Comparación lado a lado (AB#80)

**Estado actual:** La comparación VÍA CHAT ya funciona (US-31 + NL-702 con veredicto). NL-701 es una **pantalla dedicada** `/comparar` con selector visual de dos productos.

**No tiene dependencias de Azure — puedo implementarla ya.**

**Acción tuya:** Confirmame si querés:

- **Opción A**: La comparación del chat (tabla + veredicto) es suficiente → cerramos NL-701.
- **Opción B**: Querés la página `/comparar` dedicada → la implemento esta semana.

---

## Resumen de acciones en orden

| Prioridad | Acción                                                         | Desbloquea                         |
| --------- | -------------------------------------------------------------- | ---------------------------------- |
| 1         | Mergear PRs #1, #3, #4–#11, #13                                | Todo lo que sigue                  |
| 2         | Confirmar opción A/B de NL-701                                 | NL-701 (puedo empezar ahora)       |
| 3         | Confirmar opción A/B de auth (1d)                              | NL-201, NL-202, NL-203 (sin Azure) |
| 4         | Activar Azure for Students + crear DB + Storage (GRUPOS 1a-1c) | GRUPOS 3 y 4                       |
| 5         | Confirmar modelo de embeddings disponible                      | NL-401, NL-402                     |
| 6         | Armar golden set (10-15 pares)                                 | NL-404                             |
| 7         | Deploy en App Service + conectar CI/CD                         | NL-801, NL-802, NL-803             |
| 8         | Darme los puntos del informe                                   | NL-902                             |
| 9         | Darme datos de la presentación                                 | NL-903                             |
| 10        | Confirmar cantidad/tipo de seed demo                           | NL-904                             |
