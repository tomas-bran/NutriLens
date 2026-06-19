---
sidebar_position: 1
title: Analizar un producto
description: Subí una foto o PDF de la etiqueta y obtené el análisis con IA.
---

# Analizar un producto

Es el corazón de NutriLens: subís la etiqueta y la IA la convierte en un resultado claro.

![Pantalla de Analizar con los dos slots y el pipeline](/img/screens/analizar.png)

## Paso a paso

### 1. Entrá a "Analizar"

Desde la barra lateral, tocá **Analizar**. Vas a ver dos zonas para cargar imágenes y, a la derecha, el **pipeline observable** (los pasos que va a seguir el análisis).

### 2. (Opcional) Cargá el código de barras

El primer slot, **① Código de barras (opcional)**, te deja enfocar el EAN del envase. No es obligatorio, pero si el producto está en Open Food Facts **mejora la precisión** del análisis.

Podés usar **Cámara** o **Galería**. Más detalle en **[Código de barras + Open Food Facts](/funcionalidades/codigo-de-barras)**.

### 3. Cargá la foto del producto (requerida)

El segundo slot, **② Foto del producto (requerida)**, es el que NutriLens analiza. Tenés tres formas de cargarla:

- **Cámara** — sacás la foto en el momento.
- **Galería** — elegís una imagen ya guardada.
- **Arrastrar y soltar** o **pegar** (`Ctrl/⌘ + V`) en la zona de drop.

:::tip Sacá una buena foto
Enfocá el **dorso del paquete**, donde están los ingredientes y la información nutricional. Que se lea la letra chica y que haya buena luz.
:::

:::warning Falta la foto del producto
Si solo cargaste el código de barras, NutriLens te avisa que **falta la foto del producto** para poder analizar. El código de barras solo no alcanza.
:::

### 4. Tocá "Analizar"

Con la foto del producto cargada, el botón de análisis se habilita. Al tocarlo, el backend corre el **pipeline** y, al terminar, te lleva al **[resultado](/funcionalidades/resultado)**.

## ¿Qué pasa por detrás?

Cada análisis recorre 9 pasos **visibles y auditables** (lo ves en el panel "Pipeline observable"):

1. **Validación de etiqueta** — tipo y tamaño del archivo.
2. **¿Es una etiqueta?** — verificación previa, antes de gastar un análisis caro.
3. **Lectura de la etiqueta** — la IA reconoce texto e imagen.
4. **Estructura de los datos** — se organiza en un JSON validado.
5. **Clasificación por reglas** — gluten, lácteos y origen animal.
6. **Cálculo de riesgo** — según sellos y alérgenos.
7. **Explicación en lenguaje claro** — un resumen entendible.
8. **Guardar en tu catálogo** — queda disponible para vos.

Más a fondo en **[Cómo funciona por dentro](/como-funciona)**.

:::note No parece un producto
Si subís una imagen que **no parece un producto alimentario**, NutriLens lo detecta y te lo avisa, sin gastar el análisis. Probá con la foto del envase.
:::
