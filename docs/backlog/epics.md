# Épicas — NutriLens

> 6 épicas que cubren todo el producto. Cada épica agrupa user stories priorizadas para asegurar un MVP funcional mínimo demostrable.

---

## Resumen

| ID      | Épica                                         | Prioridad MVP | Objetivo                                                                    |
| ------- | --------------------------------------------- | ------------- | --------------------------------------------------------------------------- |
| **E01** | Onboarding & Upload de etiquetas              | P0 (Must)     | Permitir al usuario subir imagen o PDF de una etiqueta y validar la entrada |
| **E02** | Análisis multimodal y extracción estructurada | P0 (Must)     | Procesar el archivo con IA multimodal y devolver JSON consistente           |
| **E03** | Clasificación, reglas y explicación           | P0 (Must)     | Aplicar reglas propias para aptitud y riesgo, generar explicación simple    |
| **E04** | Persistencia e historial                      | P0 (Must)     | Guardar productos analizados y exponerlos en un historial filtrable         |
| **E05** | Chat con RAG sobre historial                  | P1 (Should)   | Permitir consultas en lenguaje natural sobre productos guardados            |
| **E06** | Pipeline observable y experiencia de uso      | P1 (Should)   | Mostrar el flujo interno del análisis y pulir la UX para la demo            |

---

## Mapa de prioridades

```
P0 — MVP mínimo demostrable
    E01: Upload + validación
    E02: Análisis IA + JSON
    E03: Reglas + riesgo + explicación
    E04: Guardado + historial básico

P1 — MVP funcional completo
    E05: Chat RAG sobre historial
    E04: Filtros e historial avanzado
    E06: Pipeline visible + JSON expandible

P2 — Polish para presentación
    E06: Responsive, animaciones, datos mockeados para demo estable
```

---

## E01 — Onboarding & Upload de etiquetas

**Objetivo:** que cualquier usuario pueda subir una etiqueta (imagen o PDF) y entender en qué estado está su carga.

**Cubre los RF:** RF-01, RF-02, RF-03, RF-13.
**Pantallas asociadas:** Inicio / Upload, Error de entrada inválida.

**Stories:** ver [`stories/E01-onboarding-y-upload.md`](./stories/E01-onboarding-y-upload.md)

---

## E02 — Análisis multimodal y extracción estructurada

**Objetivo:** convertir una imagen/PDF en un JSON con ingredientes, alérgenos, sellos, categoría y confianza, validado contra schema.

**Cubre los RF:** RF-04, RF-05, RF-06, RF-14. **Cubre los RNF:** RNF-05, RNF-06.
**Pantallas asociadas:** Análisis procesado (sección JSON).

**Stories:** ver [`stories/E02-analisis-multimodal-ia.md`](./stories/E02-analisis-multimodal-ia.md)

---

## E03 — Clasificación, reglas y explicación

**Objetivo:** aplicar reglas propias sobre el JSON extraído para calcular aptitud (vegano/celíaco/sin lactosa), riesgo (bajo/medio/alto) y generar una explicación entendible para el usuario.

**Cubre los RF:** RF-07, RF-08, RF-09. **Cubre los RNF:** RNF-03, RNF-04.
**Pantallas asociadas:** Análisis procesado (riesgo, aptitudes, explicación).

**Stories:** ver [`stories/E03-clasificacion-reglas-explicacion.md`](./stories/E03-clasificacion-reglas-explicacion.md)

---

## E04 — Persistencia e historial

**Objetivo:** guardar cada análisis y permitir consultarlo después con filtros (categoría, riesgo, alérgenos).

**Cubre los RF:** RF-10, RF-11.
**Pantallas asociadas:** Historial, Detalle de producto.

**Stories:** ver [`stories/E04-persistencia-e-historial.md`](./stories/E04-persistencia-e-historial.md)

---

## E05 — Chat con RAG sobre historial

**Objetivo:** que el usuario pueda preguntar en lenguaje natural sobre productos guardados ("dame galletitas aptas para celíacos") y obtener una respuesta fundamentada solo en su historial.

**Cubre los RF:** RF-12.
**Pantallas asociadas:** Chat / RAG.

**Stories:** ver [`stories/E05-chat-rag.md`](./stories/E05-chat-rag.md)

---

## E06 — Pipeline observable y experiencia de uso

**Objetivo:** hacer visible cómo trabaja el sistema (pipeline del agente, JSON crudo, confidence), pulir la UX (responsive, estados, design system) y tener datos mockeados para una demo estable.

**Cubre los RF:** RF-15. **Cubre los RNF:** RNF-01, RNF-02, RNF-07, RNF-08.
**Pantallas asociadas:** todas (consistencia visual y de estados).

**Stories:** ver [`stories/E06-pipeline-observable-y-ux.md`](./stories/E06-pipeline-observable-y-ux.md)
