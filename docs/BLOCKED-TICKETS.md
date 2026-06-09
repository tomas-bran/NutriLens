# NutriLens — Tickets bloqueados: qué necesitás hacer para desbloquearme

> **Generado por Claude el 2026-06-09** tras implementar todos los tickets desbloqueables.
> Cada sección describe qué necesito de vos, los pasos exactos, y la branch/ticket que continúo en cuanto me confirmes que está listo.

---

## Resumen de PRs ya abiertos (mergear cuando CI esté verde)

| PR | Branch | Tickets |
|----|--------|---------|
| #4 | `feat/NL-502-sidebar-fijo` | NL-502 (ya cerrado en ADO) |
| #5 | `feat/NL-501-paste-image` | NL-501 |
| #6 | `feat/NL-503-suggestion-pills` | NL-503 |
| #7 | `feat/US-39-timeout-fallback` | US-39 (AB#45) |
| #8 | `feat/NL-601-602-open-food-facts` | NL-601, NL-602 |
| #9 | `feat/NL-301-302-chat-history` | NL-301, NL-302 |
| #10 | `feat/NL-403-health-ranking` | NL-403 |
| #11 | `feat/NL-702-compare-verdict` | NL-702 |

Los PRs #1 (NL-303) y #3 (chore/audit) ya estaban abiertos y tienen todos los checks en verde.

---

## GRUPO 1 — Infraestructura AWS base (NL-101, NL-102, NL-103, NL-104)

**Por qué me bloquea:** Todos los tickets del E2 (multi-usuario con Cognito), E4 (RAG vectorial con pgvector) y E8 (deploy en producción) dependen de que exista una cuenta AWS con los recursos básicos levantados.

### Pasos exactos

1. **NL-104 — Cuenta AWS, presupuesto y guardas de costo (AB#64)**
   - Creá una cuenta AWS (si no tenés una) o usá la que ya tenés.
   - Habilitá un billing alert en CloudWatch: `$50 USD` como primera guardia, `$100 USD` como límite duro.
   - Anotame: `Account ID`, `Region` (recomiendo `us-east-1` por compatibilidad con Amplify).

2. **NL-101 — RDS PostgreSQL con pgvector (AB#61)**
   - Creá una instancia RDS PostgreSQL 16 (`db.t3.micro` para dev, es gratis en el free tier).
   - Habilitá la extensión `vector`: conectate con psql y ejecutá `CREATE EXTENSION vector;`.
   - Anotame: `host`, `port`, `database`, `username` + password (para `.env`).

3. **NL-102 — Bucket S3 para imágenes (AB#62)**
   - Creá un bucket S3 (`nutrilens-uploads` o similar).
   - Configurá CORS para permitir PUT desde el dominio de Amplify.
   - Creá un IAM user con permisos `s3:PutObject` y `s3:GetObject` sobre el bucket.
   - Anotame: `bucket name`, `region`, `access key ID`, `secret access key`.

4. **NL-103 — Cognito User Pool (AB#63)**
   - Creá un User Pool en Cognito con email como identificador.
   - Habilitá sign-up (o solo admin-create si querés controlarlo).
   - Creá un App Client (sin secret para frontend SPA).
   - Anotame: `User Pool ID`, `Client ID`, `Region`.

**Una vez que me des estos datos:**
- Actualizo `.env.example` con las variables nuevas.
- Implemento NL-201 (login), NL-202 (route protection), NL-203 (multi-user data model).
- Branch: `feat/NL-201-203-auth` (lo creo desde `main` en ese momento).

---

## GRUPO 2 — Multi-usuario con Cognito (NL-201, NL-202, NL-203)

**Depende de:** GRUPO 1 completo.

**Por qué me bloquea:** Sin un User Pool de Cognito operativo no puedo implementar el flujo de login ni proteger las rutas.

**NL-302 nota:** La verificación de ownership en rename/delete de conversaciones está marcada con `// TODO NL-201` en el route handler. En cuanto implementemos auth, lo conecto solo.

### Pasos que necesito de vos antes de empezar

1. Completar GRUPO 1.
2. Decidir el scope del registro:
   - **Opción A**: Solo el equipo del TP (admin crea los usuarios manualmente en Cognito console).
   - **Opción B**: Registro público con email de confirmación.
   - Me avisás cuál preferís.

---

## GRUPO 3 — RAG vectorial con pgvector (NL-401, NL-402, NL-404)

**Depende de:** NL-101 (RDS con pgvector).

**NL-401 — Embeddings al guardar (AB#71):** Cuando un producto se persiste, genero su embedding con un modelo de texto (Azure OpenAI `text-embedding-ada-002` o similar) y lo guardo en la columna `embedding vector(1536)`.

**NL-402 — Retrieval semántico (AB#72):** Reemplaza o complementa el retrieval actual del chat con una búsqueda por similitud coseno sobre los embeddings.

**NL-404 — Golden set de evaluación (AB#74):** Requiere que alguien (vos o el equipo) arme un conjunto de 10-15 pares (pregunta, productos_esperados) para evaluar el retrieval.

### Pasos que necesito de vos antes de empezar

1. Completar NL-101 (RDS con pgvector).
2. Confirmar qué modelo de embeddings tenés disponible:
   - Azure OpenAI con `text-embedding-ada-002` → darme `endpoint` y `api-key`.
   - Otro modelo → decirme cuál.
3. Para NL-404: armar al menos 10 pares (pregunta, nombres de productos esperados en la respuesta) en un JSON o spreadsheet.

---

## GRUPO 4 — Deploy en AWS (NL-801, NL-802, NL-803)

**Depende de:** GRUPO 1 completo.

**NL-801 — Amplify Hosting (AB#82):**
1. Ir a AWS Amplify Console.
2. Conectar el repo GitHub `fede-martucci/NutriLens`.
3. Amplify detecta Next.js automáticamente. Seleccioná `main` como rama de producción.
4. Anotame la URL que genera Amplify (ej. `https://main.d1234xyz.amplifyapp.com`).

**NL-802 — Conectividad app ↔ RDS/S3 (AB#83):**
- Necesito las variables de entorno reales para setearlas en Amplify Console.
- Configurar VPC o SG para que Amplify pueda llegar a RDS.

**NL-803 — CI/CD completo (AB#84):**
- El `.github/workflows/ci.yml` ya existe. Solo necesito que GitHub Actions tenga los secrets:
  - `DATABASE_URL` (apuntando a RDS)
  - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
  - `AZURE_AI_FOUNDRY_KEY`, `AZURE_AI_FOUNDRY_ENDPOINT`
- Ir a `Settings → Secrets → Actions` en el repo y agregarlos.

### Pasos concretos para desbloquearme

1. Completar GRUPO 1.
2. Seguir los pasos de NL-801 (Amplify connect).
3. Setear los secrets en GitHub Actions (NL-803).
4. Confirmarme la URL de Amplify.

---

## GRUPO 5 — Calidad y cierre académico (NL-901, NL-902, NL-903, NL-904)

### NL-901 — Tests al 80% (AB#85)

**Estado:** Implementable por mí, pero conviene esperarlo para después de que los PRs abiertos (#4-#11) estén mergeados. En cuanto los mergees, corro `npm run test:coverage` sobre el código combinado y ajusto lo que falte para llegar al 80%.

**Acción tuya:** Mergear los PRs abiertos → decirme "ya mergeé los PRs" → yo corro coverage y subo lo que falte.

### NL-902 — Actualizar informe técnico final (AB#86)

**Esta es tuya.** El informe técnico documenta decisiones de diseño, tradeoffs y lecciones aprendidas. Yo puedo ayudarte a redactarlo si me das los puntos que querés incluir, pero el contenido académico (qué aprendiste, qué mejorarías, etc.) necesita tu voz.

**Acción tuya:** Completar el template en `docs/presentation/informe-presentacion.md` (ya existe en la branch `chore/audit-2026-05`) o escribirlo en cualquier formato y yo lo estructuro.

### NL-903 — Presentación oral + guion de demo (AB#87)

**Esta es tuya también.** Puedo generar un borrador de slides o guion si me describís:
1. Duración de la presentación.
2. Audiencia (docentes, pares, cliente real).
3. Puntos que querés destacar.

### NL-904 — Seed de datos para la demo pública (AB#88)

**Implementable por mí.** El script de seed ya existe (`npm run seed`). Solo necesito saber:
1. ¿Cuántos productos querés en el seed de demo pública? (El actual tiene 50, ¿va bien?)
2. ¿Hay alguna categoría o tipo de producto específico que querés mostrar en la demo?

---

## NL-701 — Comparación lado a lado (AB#80)

**Estado actual:** La comparación VÍA CHAT ya funciona (US-31 + NL-702). NL-701 pide una **pantalla dedicada** de comparación lado a lado (fuera del chat).

**Análisis:** Si la tabla del chat cubre el caso de uso para la demo, NL-701 puede considerarse parcialmente cubierto. Si querés una página `/comparar` dedicada con selector de dos productos y tabla visual, puedo implementarla sin dependencias de AWS.

**Acción tuya:** Confirmame si querés:
- **Opción A**: La comparación del chat (tabla + veredicto) es suficiente para la demo → cerramos NL-701 como cubierto.
- **Opción B**: Querés una página `/comparar` dedicada → la implemento (3-4 horas de trabajo).

---

## Resumen de acciones ordenadas por prioridad

| Prioridad | Acción | Desbloquea |
|-----------|--------|-----------|
| 1 | Mergear PRs #1, #3, #4, #5, #6, #7, #8, #9, #10, #11 | Todo lo que sigue |
| 2 | Confirmar opción A/B de NL-701 | NL-701 |
| 3 | Crear cuenta AWS + RDS + S3 + Cognito (GRUPO 1) | GRUPOS 2, 3, 4 |
| 4 | Definir scope de registro (Opción A/B) | NL-201, NL-202, NL-203 |
| 5 | Proveer modelo de embeddings | NL-401, NL-402 |
| 6 | Armar golden set para NL-404 | NL-404 |
| 7 | Conectar Amplify + setear secrets | NL-801, NL-802, NL-803 |
| 8 | Decirme "PRs mergeados" | NL-901 (tests al 80%) |
| 9 | Completar puntos del informe | NL-902 |
| 10 | Darme datos de la presentación | NL-903 |
| 11 | Confirmar cantidad/tipo de seed | NL-904 |
