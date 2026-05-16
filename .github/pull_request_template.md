<!--
  IMPORTANTE: la línea "Closes AB#<id>" dispara el cierre automático del work
  item en Azure DevOps cuando este PR se mergea a main.
  Si el PR cubre varias user stories, agregá una línea Closes por cada una.
-->

Closes AB#

## Qué hace

<!-- 1-2 oraciones explicando el cambio funcional -->

## Cómo probarlo manualmente

1. ...
2. ...

## Acceptance criteria cubiertos

<!-- Marcá cada escenario Gherkin de la US con su test correspondiente -->

- [ ] Escenario 1: <nombre del Gherkin> → `tests/.../foo.test.ts`
- [ ] Escenario 2: <nombre del Gherkin> → `tests/.../bar.test.ts`

## Casos borde testeados

<!-- Cubrir todos los listados en docs/specs/E0X-*.md §"Casos borde" que apliquen -->

- [ ] <caso del spec>
- [ ] <caso del spec>

## Coverage

<!-- Para PRs que tocan src/lib/** (target ≥80% lines / ≥75% branches) -->

- `src/lib/<modulo>`: X% lines, Y% branches

## Follow-ups (opcional)

- ...

## Capturas (si aplica)

<!-- Para cambios de UI: screenshot o GIF mobile + desktop -->

---

## Checklist pre-merge

- [ ] Tests verdes localmente (`npm run test:ci`)
- [ ] Sin TODOs, `console.log`, `debugger` ni dead code
- [ ] Variables nuevas agregadas a `.env.example` con default y comentario
- [ ] Spec actualizado si hubo cambios de contrato (API, schema, etc.)
- [ ] Si tocó UI: probado en mobile (`<768px`) y desktop (`≥1024px`)
