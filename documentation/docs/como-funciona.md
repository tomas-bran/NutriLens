---
sidebar_position: 5
title: Cómo funciona por dentro
description: Pipeline observable, reglas sobre el modelo y proveedores de IA.
---

# Cómo funciona por dentro

Para curiosos (y para la cátedra): qué pasa entre que subís la foto y ves el resultado.

## El LLM extrae, las reglas deciden

La regla de oro de NutriLens:

> El modelo de IA **extrae** los datos crudos de la etiqueta. Las **aptitudes** (vegano, celíaco, sin lactosa) y el **riesgo** se calculan con **reglas propias y deterministas**.

Así, la decisión que afecta tu salud **nunca** depende de lo que "opine" el modelo: es auditable y reproducible.

## Pipeline observable (9 pasos)

El análisis es una secuencia de pasos, **todos visibles en la UI** (panel "Pipeline observable" en _Analizar_):

| #   | Paso                   | Qué hace                                         |
| --- | ---------------------- | ------------------------------------------------ |
| 1   | `validate_file`        | Tipo y tamaño del archivo.                       |
| 2   | `detect_label_kind`    | ¿Es un producto/etiqueta? (antes del paso caro). |
| 3   | `extract_with_ia`      | La IA lee la etiqueta → JSON.                    |
| 4   | `validate_schema`      | Valida el JSON con Zod (estricto).               |
| 5   | `enrich_with_off`      | Cruza con Open Food Facts (si hay código).       |
| 6   | `apply_rules`          | Reglas → aptitudes.                              |
| 7   | `compute_risk`         | Fórmula → riesgo bajo/medio/alto.                |
| 8   | `generate_explanation` | Explicación en lenguaje claro.                   |
| 9   | `persist`              | Guarda el producto + el trace.                   |

Cada paso reporta su estado y queda en el **trace** que los admins ven en la _Vista técnica_.

## Proveedores de IA intercambiables

La IA está detrás de una sola interface (`IaProvider`) con cuatro implementaciones: **Mock**, **Foundry**, **Azure OpenAI** y **OpenAI**. Esto permitió un caso real: **migrar de Phi-4 (que no funcionaba) a `gpt-5.1`** cambiando solo variables de entorno, sin tocar la lógica de negocio.

- **En producción:** `gpt-5.1` vía Azure OpenAI.
- **En tests y CI:** un **Mock determinista**, para no gastar crédito.

## Datos y privacidad

- Tu **catálogo** y tus **conversaciones** quedan asociados a tu usuario.
- Los **productos** son una base de conocimiento **compartida** (no llevan tu identidad); el vínculo "Analizados por vos" solo registra quién analizó qué.
- Las imágenes se guardan para poder mostrar el resultado y auditar el análisis.
