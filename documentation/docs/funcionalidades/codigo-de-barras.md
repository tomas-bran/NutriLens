---
sidebar_position: 5
title: Código de barras + Open Food Facts
description: Cómo el código de barras mejora la precisión del análisis.
---

# Código de barras + Open Food Facts

Al analizar, el primer slot te deja cargar el **código de barras (EAN)** del envase. Es **opcional**, pero suma mucho.

## Cómo cargarlo

1. En **[Analizar](/funcionalidades/analizar)**, usá el slot **① Código de barras**.
2. Sacá una foto con **Cámara** o elegí una de **Galería**, enfocando bien el código.
3. Cargá también la **foto del producto** y tocá **Analizar**.

## Qué hace por detrás

NutriLens decodifica el EAN y lo cruza con **[Open Food Facts](https://world.openfoodfacts.org)**, una base de datos abierta y colaborativa de productos. Si el producto está:

- ✅ Completa el **nombre** y la **categoría** correctos (en vez de quedar como "otros").
- ✅ Suma **ingredientes** y **alérgenos** desde una fuente autoritativa.
- ✅ **Sube la confianza** del análisis.

## Validación "soft" (nunca bloquea)

El código de barras es un **booster de confianza**, no una barrera:

- Si la imagen del código **no se puede leer**, el análisis igual avanza con la foto del producto.
- Si el código **no está** en Open Food Facts, se usa lo que extrajo la IA de la foto.
- Si el código parece de **otro producto**, NutriLens lo avisa, pero no bloquea.

:::tip
¿Foto del código borrosa? NutriLens intenta leer los **dígitos impresos** debajo de las barras como respaldo.
:::
