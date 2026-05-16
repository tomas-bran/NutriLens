# Backlog — NutriLens

> Desglose del producto en Product Brief + 6 Épicas + User Stories con criterios de aceptación en Gherkin y story points Fibonacci. Pensado como entrada para el equipo y para cargar como work items en Azure DevOps.

---

## Estructura

```
docs/backlog/
├── README.md                    ← este índice
├── product-brief.md             ← visión, usuarios, MVP, criterios, riesgos
├── epics.md                     ← las 6 épicas con prioridad MVP
└── stories/
    ├── E01-onboarding-y-upload.md
    ├── E02-analisis-multimodal-ia.md
    ├── E03-clasificacion-reglas-explicacion.md
    ├── E04-persistencia-e-historial.md
    ├── E05-chat-rag.md
    └── E06-pipeline-observable-y-ux.md
```

---

## Resumen del backlog

| Épica | Stories | Total SP | P0 (MVP min) | P1 (MVP completo) | P2 (Polish) |
|-------|---------|---------|--------------|-------------------|-------------|
| **E01** Onboarding & Upload | 7 | 19 | 16 | 3 | 0 |
| **E02** Análisis IA multimodal | 8 | 29 | 26 | 3 | 0 |
| **E03** Clasificación, reglas y explicación | 5 | 16 | 16 | 0 | 0 |
| **E04** Persistencia e historial | 6 | 18 | 13 | 5 | 0 |
| **E05** Chat con RAG | 6 | 23 | 0 | 18 | 5 |
| **E06** Pipeline observable y UX | 7 | 21 | 2 | 19 | 0 |
| **Total** | **39** | **126** | **73** | **48** | **5** |

> Story points totales: **126**. Para un equipo de 4 personas (~2 semanas), priorizar P0 (73 SP) garantiza el MVP mínimo demostrable.

---

## Convenciones para Azure DevOps

Cada user story está pensada para mapearse a un work item:

- **Work Item Type:** `User Story` (Agile) o `Product Backlog Item` (Scrum).
- **Title:** `[E0X] US-XX — <título>`.
- **Description:** el "Como / quiero / para".
- **Acceptance Criteria:** los escenarios Gherkin (Dado / Cuando / Entonces).
- **Story Points:** 1, 2, 3, 5 u 8 (Fibonacci).
- **Tags:** `epic:E0X`, `priority:P0|P1|P2`, `mvp`.
- **Parent:** el Work Item de la épica correspondiente.

---

## Prioridades

- **P0 (Must Have)** → entran en el MVP mínimo demostrable. Sin estas stories el TP no puede presentarse.
- **P1 (Should Have)** → completan el MVP funcional. Idealmente entran antes de la entrega final.
- **P2 (Could Have)** → polish o bonus. Mejoran la demo pero no son bloqueantes.

---

## Cómo usar este backlog

1. Leer [`product-brief.md`](./product-brief.md) para alinear contexto y visión.
2. Revisar [`epics.md`](./epics.md) para entender el desglose grueso.
3. Sprint planning: cada persona del equipo toma stories P0 según su responsabilidad principal.
4. Cargar las stories en Azure DevOps respetando las convenciones de arriba.
5. Cada story que se cierra debe cumplir TODOS sus criterios de aceptación.

---

## Siguiente paso (post-backlog)

Una vez aprobado el backlog, el plan es escribir **specs SDD por épica** en `/docs/specs/` con:

- Contratos de API (endpoints, requests, responses).
- Schemas (JSON, base de datos).
- Decisiones técnicas y trade-offs.
- Casos borde y manejo de errores.
- Diagramas de secuencia para los flujos críticos.
