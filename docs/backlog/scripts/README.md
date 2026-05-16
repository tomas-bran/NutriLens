# Scripts del backlog

## `azure_devops_upload.py`

Sube el backlog completo (6 Epics + 39 User Stories) a Azure DevOps en una sola corrida.

### Requisitos

- Python 3.8 o superior.
- Sin dependencias externas (solo stdlib).
- Un Personal Access Token (PAT) de Azure DevOps con scope **Work Items: Read & Write**.

### Cómo generar el PAT

1. Entrá a `https://dev.azure.com/{tu_org}/_usersSettings/tokens`.
2. "New Token" → name "NutriLens Backlog Upload".
3. Scope → custom defined → marcar `Work Items: Read, Write & Manage`.
4. Copiar el token (solo se ve una vez).

### Uso

```bash
# 1. Exportar el PAT
export AZURE_DEVOPS_PAT="tu_pat_aqui"

# 2. Dry run (no crea nada, solo imprime lo que haría)
python3 docs/backlog/scripts/azure_devops_upload.py --dry-run

# 3. Subida real
python3 docs/backlog/scripts/azure_devops_upload.py
```

Defaults configurados:

- `--org tbranchesi`
- `--project NutriLens`

Cambialos con `--org` / `--project` si hace falta.

### Qué hace el script

1. Detecta los work item types disponibles en el proyecto (Agile / Scrum / Basic).
2. Crea 6 **Epics** con título, descripción y tags `mvp; nutrilens`.
3. Crea 39 **User Stories** (o `Product Backlog Item` / `Issue` según el process) con:
   - Título con código `US-XX`.
   - Description en formato "Como / quiero / para".
   - Acceptance Criteria con escenarios Gherkin (Dado / Cuando / Entonces) en HTML.
   - Story Points (Fibonacci: 1, 2, 3, 5, 8).
   - Tags `mvp`, `epic:E0X`, `priority:P0|P1|P2`.
   - **Parent link** automático a la épica correspondiente.

### Recuperarse de un error

- El script imprime un log por work item creado (con su ID en ADO).
- Si falla a mitad de camino, podés correr con `--story-only` para no duplicar las épicas y reintentar las stories.
- Si querés borrar todo y reintentar, usar la UI de Azure Boards (Bulk edit → Delete).
