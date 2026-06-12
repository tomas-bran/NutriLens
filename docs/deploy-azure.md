# Deploy de NutriLens en Azure — paso a paso

> Cubre NL-101 (DB), NL-801/802/803 (deploy + env + CI/CD) y la guardia de costos NL-104.
> Stack: Azure for Students ($100 crédito). Costo esperado para el TP: **$0** (free tiers).
> La IA sigue usando el recurso Azure OpenAI existente (`tbranchesi-7722-resource`), no hace falta crear otro.

## 0. Prerrequisitos

```bash
brew install azure-cli          # si no lo tenés
az login                        # con el email de la suscripción Students
az account show --query id -o tsv   # anotá el Subscription ID
az group create --name nutrilens-rg --location eastus
```

---

## 1. PostgreSQL Flexible Server (NL-101 / AB#61)

> **⚠️ Regiones (aprendido en el deploy real):** la suscripción Students tiene
> casi todas las regiones bloqueadas por policy (`sys.regionrestriction` permite
> solo eastus, northcentralus, southcentralus, southafricanorth y mexicocentral),
> y de esas, eastus y southcentralus rechazan Postgres Flexible. **northcentralus
> funciona.** El RG puede quedar en eastus aunque la DB viva en otra región.

```bash
az postgres flexible-server create \
  --name nutrilens-db \
  --resource-group nutrilens-rg \
  --location northcentralus \
  --admin-user nutrilens \
  --admin-password '<PASSWORD_FUERTE>' \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --database-name nutrilens

# Firewall: servicios de Azure (App Service) + tu IP local (para migrar/seedear)
az postgres flexible-server firewall-rule create \
  --resource-group nutrilens-rg --name nutrilens-db \
  --rule-name allow-azure-services \
  --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0

az postgres flexible-server firewall-rule create \
  --resource-group nutrilens-rg --name nutrilens-db \
  --rule-name allow-mi-ip \
  --start-ip-address $(curl -s ifconfig.me) --end-ip-address $(curl -s ifconfig.me)
```

**⚠️ Gotcha pgvector** (para GRUPO 3 / RAG): en Flexible Server las extensiones requieren allowlist **antes** del `CREATE EXTENSION`:

```bash
az postgres flexible-server parameter set \
  --resource-group nutrilens-rg --server-name nutrilens-db \
  --name azure.extensions --value vector
```

```sql
-- conectado a la DB nutrilens:
CREATE EXTENSION IF NOT EXISTS vector;
```

**La connection string de producción** (usala en los pasos 2, 4 y 5):

```
postgresql://nutrilens:<PASSWORD>@nutrilens-db.postgres.database.azure.com:5432/nutrilens?sslmode=require
```

---

## 2. Migraciones + seed (desde tu máquina, una vez)

```bash
cd ~/Desktop/Sirius/NutriLens
DATABASE_URL='postgresql://nutrilens:<PASSWORD>@nutrilens-db.postgres.database.azure.com:5432/nutrilens?sslmode=require' \
  npx prisma migrate deploy

DATABASE_URL='...' npm run seed     # 50 productos demo (NL-904)
```

---

## 3. App Service (NL-801 / AB#82)

```bash
az appservice plan create \
  --name nutrilens-plan \
  --resource-group nutrilens-rg \
  --sku F1 \
  --is-linux

az webapp create \
  --name nutrilens-app \
  --resource-group nutrilens-rg \
  --plan nutrilens-plan \
  --runtime "NODE:22-lts"   # Node 20 ya no existe en App Service (EOL abr-2026)

# Startup: usamos el output standalone de Next (requiere PR #12 mergeado)
az webapp config set \
  --resource-group nutrilens-rg --name nutrilens-app \
  --startup-file "node server.js"
```

URL final: `https://nutrilens-app.azurewebsites.net`

**Limitaciones de F1 a tener en cuenta para la demo:** 60 min de CPU/día, 1 GB RAM, sin
always-on (primer request tras inactividad tarda ~30s por cold start — entrá a la URL
unos minutos antes de presentar).

---

## 4. Variables de entorno (NL-802 / AB#83)

```bash
az webapp config appsettings set \
  --resource-group nutrilens-rg --name nutrilens-app \
  --settings \
  DATABASE_URL='postgresql://nutrilens:<PASSWORD>@nutrilens-db.postgres.database.azure.com:5432/nutrilens?sslmode=require' \
  IA_PROVIDER='azure-openai' \
  AZURE_OPENAI_ENDPOINT='https://tbranchesi-7722-resource.services.ai.azure.com/openai/v1' \
  AZURE_OPENAI_KEY='<LA_KEY_QUE_YA_USAN>' \
  AZURE_OPENAI_MODEL_MULTIMODAL='gpt-5.1' \
  HOSTNAME='0.0.0.0' \
  PIPELINE_TIMEOUT_MS='25000'
```

Notas:

- `IA_PROVIDER=azure-openai` con `gpt-5.1` es la combinación **ya probada localmente**
  (el endpoint a nivel resource `/openai/v1` es el formato canónico; el de
  `/api/projects/...` también funciona pero tuvo un 404 transitorio el 11/6).
- `AZURE_OPENAI_MODEL_MINI` puede omitirse: el provider cae al multimodal.
- `HOSTNAME=0.0.0.0` es necesario para que el server standalone escuche fuera del
  loopback. El `PORT` lo inyecta App Service solo.
- `NEXTAUTH_SECRET`/`NEXTAUTH_URL` recién cuando exista NL-201 (auth).
- Blob Storage (NL-102) hoy **no se usa** en el código — agregar
  `AZURE_STORAGE_CONNECTION_STRING` recién cuando se implemente.

---

## 5. CI/CD desde GitHub (NL-803 / AB#84)

Secrets en el repo (`Settings → Secrets and variables → Actions`):

| Secret                         | Valor                                                         |
| ------------------------------ | ------------------------------------------------------------- |
| `AZURE_WEBAPP_PUBLISH_PROFILE` | App Service → Overview → _Get publish profile_ (XML completo) |
| `DATABASE_URL`                 | la connection string de producción                            |

Crear `.github/workflows/deploy.yml`:

```yaml
name: Deploy a Azure

on:
  push:
    branches: [main]
  workflow_dispatch: {}

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npx prisma generate

      # Migraciones contra la DB de prod ANTES de publicar el código nuevo
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      # Build standalone (gated por BUILD_STANDALONE, ver PR #12)
      - run: npm run build
        env:
          BUILD_STANDALONE: '1'

      # El output standalone necesita los assets estáticos al lado
      - run: |
          cp -r .next/static .next/standalone/.next/static
          cp -r public .next/standalone/public

      - uses: azure/webapps-deploy@v3
        with:
          app-name: nutrilens-app
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: .next/standalone
```

> Alternativa sin YAML: portal → App Service → **Deployment Center** → GitHub →
> repo/branch `main`. Azure genera el workflow solo, pero deploya el repo completo
> con `node_modules` (~lento en F1) y hay que setear el startup a `npm start`
> (sin standalone). El YAML de arriba es más rápido y usa la misma config que Docker.

---

## 6. Guardia de costos (NL-104 / AB#64)

Portal → **Cost Management + Billing** → **Budgets** → Create:

- Scope: la suscripción Students. Monto: **$20/mes**.
- Alertas: 80% ($16) y 100% ($20) → tu email.

Con B1ms free 12 meses + F1 gratis, el gasto esperado es $0; el budget es la red de seguridad.

---

## 7. Smoke test post-deploy

```bash
# La app responde
curl -s -o /dev/null -w '%{http_code}\n' https://nutrilens-app.azurewebsites.net

# El pipeline completo funciona (etiqueta real → 200 con id; imagen no-etiqueta → 422)
curl -s -X POST https://nutrilens-app.azurewebsites.net/api/analyze \
  -F "file=@etiqueta-de-prueba.png;type=image/png" | head -c 300

# El historial lee de la DB seedeada
curl -s https://nutrilens-app.azurewebsites.net/historial | grep -c producto
```

## Gotchas del runtime Linux (encontrados en el deploy real)

Dos fallas que solo aparecen con el bundle corriendo en App Service:

1. **Prisma sin engine Linux** → 500 en todo acceso a DB. Fix commiteado:
   `binaryTargets = ["native", "debian-openssl-3.0.x"]` en `prisma/schema.prisma`.
2. **`DOMMatrix is not defined`** en `/api/analyze` → pdfjs-dist carga
   `@napi-rs/canvas` dinámicamente y el tracing del standalone no lo incluye.
   Fix commiteado: dependencia `@napi-rs/canvas` + `outputFileTracingIncludes`
   en `next.config.mjs`. **Si deployás con un build hecho en macOS**, el binario
   nativo que se tracea es el de mac — inyectá el de Linux antes de zipear:

   ```bash
   npm pack @napi-rs/canvas-linux-x64-gnu --pack-destination /tmp
   mkdir -p .next/standalone/node_modules/@napi-rs/canvas-linux-x64-gnu
   tar -xzf /tmp/napi-rs-canvas-linux-x64-gnu-*.tgz -C .next/standalone/node_modules/@napi-rs/canvas-linux-x64-gnu --strip-components=1
   ```

   En CI (ubuntu) esto no hace falta: el build ya sale con el binario correcto.

## Estado real del deploy (2026-06-12)

- **App**: https://nutrilens-app.azurewebsites.net (F1, NODE:22-lts, smoke test 3/3)
- **DB**: `nutrilens-db` en northcentralus — migraciones + seed 50 productos + pgvector
- **Budget**: $20/mes con alertas 80%/100% activo
- **Password de DB**: bloque "Producción Azure" al final de `.env.local`
- **Pendiente**: secrets de GitHub (`AZURE_WEBAPP_PUBLISH_PROFILE`, `DATABASE_URL`)
  los tiene que cargar tomi (colaboradores sin admin no pueden) + `deploy.yml` del §5

## Checklist final

- [ ] DB creada + firewall + `azure.extensions=vector` + extensión creada
- [ ] `prisma migrate deploy` + seed corridos contra prod
- [ ] App Service F1 con startup `node server.js`
- [ ] App settings cargadas (incluida `HOSTNAME=0.0.0.0`)
- [ ] PR #12 mergeado (sin él, `BUILD_STANDALONE=1` no genera el output standalone)
- [ ] Secrets `AZURE_WEBAPP_PUBLISH_PROFILE` y `DATABASE_URL` en GitHub
- [ ] Workflow `deploy.yml` en main → primer deploy verde
- [ ] Budget de $20 con alertas
- [ ] Smoke test OK + URL anotada en el README
