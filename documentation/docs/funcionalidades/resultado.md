---
sidebar_position: 2
title: Leer el resultado
description: Cómo interpretar el riesgo, las aptitudes, los sellos y la explicación.
---

# Leer el resultado

Cuando termina el análisis (o al abrir un producto desde el catálogo) vas a esta pantalla, que muestra **el mismo dato en varias vistas**.

![Pantalla de resultado de un producto](/img/screens/resultado.png)

## Qué vas a ver

### Encabezado

El **nombre**, la **categoría** (eyebrow arriba), el nivel de **confianza** del análisis y la fecha. La imagen que subiste aparece a la izquierda.

### Riesgo (el semáforo)

Un medidor **bajo / medio / alto** calculado con una fórmula propia a partir de los sellos y alérgenos detectados. Debajo, en una línea, **por qué** ese nivel (p. ej. _"Por alérgenos: soja y 1 sello"_).

| Nivel        | Qué significa                                   |
| ------------ | ----------------------------------------------- |
| 🟢 **Bajo**  | Sin advertencias relevantes detectadas.         |
| 🟡 **Medio** | Tiene algún sello o alérgeno a tener en cuenta. |
| 🔴 **Alto**  | Varios sellos / alérgenos de mayor impacto.     |

### Aptitud por dieta

Tres filas con ícono y estado **Apto / No apto** para:

- **Vegano** 🌱
- **Apto celíaco** 🌾
- **Sin lactosa** 🥛

Estas aptitudes **se derivan de reglas propias** sobre los ingredientes y alérgenos, no de la "opinión" del modelo.

### En palabras simples

Una explicación de 2-3 oraciones, en castellano claro, de por qué el producto quedó así.

### Ingredientes, Alérgenos y Sellos

- **Ingredientes** — la lista detectada (y completada con Open Food Facts si cargaste el código de barras).
- **Alérgenos** — chips con glifo (gluten, leche, huevo, frutos secos, soja, etc.).
- **Sellos detectados** — los octágonos negros regulatorios (Ley 27.642): _exceso en azúcares, sodio, grasas…_

## Vista técnica (admin)

Si sos administrador, abajo aparece la sección **Admin · Vista técnica** con el **JSON crudo** extraído y el **trace del pipeline**, y el panel para **[renombrar o eliminar](/administracion)** el producto.

:::note
NutriLens es informativo. Ante cualquier duda de salud, consultá el etiquetado oficial y a un profesional.
:::
