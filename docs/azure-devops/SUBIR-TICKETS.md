# Subida de work items a Azure DevOps vía MCP

Archivo fuente: `work-items.json` (37 items: 9 Epics + 28 User Stories/Tasks). Generado desde `NutriLens-Plan-Entrega-Final.md`.

## Prompt sugerido para Claude Code

> Lee `azure-devops/work-items.json` y crea todos los work items en Azure DevOps (proyecto NutriLens) vía MCP siguiendo `azure-devops/SUBIR-TICKETS.md`. Hacelo en 3 pasadas (epics → hijos → links de dependencia), guardá el mapeo de IDs en `azure-devops/work-items-map.json` y al final verificá contra el checklist.

## Pre-chequeos

1. Confirmar organización/proyecto y que el process template sea **Agile** (tipos: Epic, User Story, Task). Si es **Scrum**, usar `Product Backlog Item` en lugar de `User Story`.
2. Crear/confirmar las iteraciones **Sprint 1** (08→14-jun-2026) y **Sprint 2** (15→21-jun-2026) — fechas en `sprintDates`.
3. Idempotencia: antes de crear cada item, buscar por título exacto (WIQL); si ya existe, saltearlo y registrar su ID en el mapeo.

## Mapeo de campos (JSON → Azure DevOps)

| JSON                             | Campo ADO                                  | Notas                                                                                                                                                 |
| -------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`                           | Work item type                             | Epic / User Story / Task                                                                                                                              |
| `title`                          | `System.Title`                             | Para hijos, prefijar con el id local: `NL-101 · <title>` (facilita trazabilidad y búsqueda)                                                           |
| `description` + `technicalNotes` | `System.Description`                       | HTML: descripción en `<p>`; si hay notas, agregar `<p><b>Notas técnicas:</b> …</p>`                                                                   |
| `acceptanceCriteria[]`           | `Microsoft.VSTS.Common.AcceptanceCriteria` | Como `<ul><li>…</li></ul>`. **Solo existe en User Story**: para Tasks, anexar la lista al final de Description bajo `<b>Criterios de aceptación:</b>` |
| `storyPoints`                    | `Microsoft.VSTS.Scheduling.StoryPoints`    | Solo User Story. Para Tasks no setear (o usar `OriginalEstimate` en horas si el equipo lo usa)                                                        |
| `priority`                       | `Microsoft.VSTS.Common.Priority`           | 1=P0, 2=P1, 3=recortable (ver `priorityLegend`)                                                                                                       |
| `iteration`                      | `System.IterationPath`                     | `NutriLens\Sprint 1` o `NutriLens\Sprint 2` (los Epics no llevan iteración)                                                                           |
| `tags[]`                         | `System.Tags`                              | Unir con `"; "`                                                                                                                                       |
| `parent`                         | Link `System.LinkTypes.Hierarchy-Reverse`  | Hacia el ID real del Epic creado                                                                                                                      |
| `dependsOn[]`                    | Link `System.LinkTypes.Dependency-Reverse` | El item depende de (predecessor) cada ID listado                                                                                                      |

## Orden de ejecución

1. **Pasada 1 — Epics (E1…E9):** crearlos y guardar `{id_local: {adoId, url}}` en `work-items-map.json`.
2. **Pasada 2 — Hijos (NL-xxx):** crear cada uno con todos los campos + parent link usando el mapeo. Ir actualizando el mapeo.
3. **Pasada 3 — Dependencias:** recorrer `dependsOn` y crear los links predecessor/successor entre IDs reales.

## Checklist de verificación final

- [ ] 37 items creados (9 Epics, 15 User Stories, 13 Tasks) — comparar con WIQL count por tipo.
- [ ] Todos los hijos tienen parent (ningún NL-xxx huérfano).
- [ ] Iteraciones asignadas: 15 items en Sprint 1, 13 en Sprint 2.
- [ ] Links de dependencia creados (20 relaciones `dependsOn` en total).
- [ ] Spot-check de 3 items (ej. NL-201, NL-402, NL-801): descripción, AC, SP, prioridad, tags.
- [ ] `work-items-map.json` actualizado y commiteado.

## Notas

- NL-402 y NL-901 arrancan en Sprint 1 pero continúan en Sprint 2 (por eso la suma nominal de SP por sprint difiere levemente del plan; mover de iteración a mitad de sprint si el equipo lo prefiere).
- Los items con `priority: 3` son la línea de corte (§6 del plan): NL-404 y NL-702 se recortan primero si no llegan.
- Si el equipo prefiere Story Points también en las Tasks, crearlas como User Story con tag extra `tech-task`.
