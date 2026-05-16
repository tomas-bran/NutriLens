# E06 — Pipeline observable y experiencia de uso

> User stories del épico E06. Cubre RF-15 y RNF-01, RNF-02, RNF-07, RNF-08.

---

## US-33 — Mostrar el pipeline del análisis en la UI

**Story Points:** 5
**Prioridad MVP:** P1
**Épica:** E06

### Descripción
**Como** usuario,
**quiero** ver paso a paso cómo se procesó mi etiqueta (validación → OCR → extracción → reglas → riesgo),
**para** entender qué hace la app y confiar en el resultado.

### Criterios de aceptación

**Escenario 1: Pipeline visible en la pantalla de resultado**
- **Dado** que el análisis terminó
- **Cuando** se renderiza la pantalla
- **Entonces** veo una sección "Pipeline del análisis" con los pasos (ingesta, validación, OCR/lectura visual, parsing, detección alérgenos, clasificación aptitud, cálculo riesgo, explicación, persistencia)
- **Y** cada paso muestra estado (ok/skipped/error) y duración

**Escenario 2: Paso fallido**
- **Dado** que un paso del pipeline falló
- **Cuando** se renderiza
- **Entonces** ese paso aparece con icono de error y mensaje

---

## US-34 — Ver JSON extraído colapsable

**Story Points:** 2
**Prioridad MVP:** P1
**Épica:** E06

### Descripción
**Como** usuario técnico (o evaluador del TP),
**quiero** poder ver el JSON crudo que generó la IA,
**para** validar la calidad de la extracción y la consistencia del schema.

### Criterios de aceptación

**Escenario 1: Bloque colapsable**
- **Dado** que estoy en la pantalla de resultado
- **Cuando** abro la sección "JSON extraído"
- **Entonces** veo el JSON formateado, con sintaxis resaltada y un botón "Copiar"

**Escenario 2: Cerrado por defecto**
- **Dado** que entro a la pantalla
- **Cuando** se renderiza
- **Entonces** la sección JSON está colapsada (no satura visualmente al usuario casual)

---

## US-35 — Estados de carga y error consistentes

**Story Points:** 2
**Prioridad MVP:** P0
**Épica:** E06

### Descripción
**Como** usuario,
**quiero** ver indicadores de carga claros y mensajes de error uniformes en toda la app,
**para** que la experiencia sea predecible.

### Criterios de aceptación

**Escenario 1: Estado de carga global**
- **Dado** que cualquier acción dispara una request
- **Cuando** está en curso
- **Entonces** se muestra un indicador visual consistente (skeleton, spinner o barra)

**Escenario 2: Errores uniformes**
- **Dado** que cualquier endpoint devuelve error
- **Cuando** la UI lo recibe
- **Entonces** se muestra un componente `<ErrorState>` con icono + título + descripción + acción (reintentar o volver)

---

## US-36 — App responsive (desktop + mobile)

**Story Points:** 5
**Prioridad MVP:** P1
**Épica:** E06

### Descripción
**Como** usuario que usa la app desde el celular o la computadora,
**quiero** que la interfaz se adapte a la pantalla,
**para** que sea usable en ambos contextos.

### Criterios de aceptación

**Escenario 1: Layout mobile (<768px)**
- **Dado** que abro la app en un ancho menor a 768px
- **Cuando** se renderiza
- **Entonces** la navegación es bottom-bar/hamburguesa
- **Y** las tarjetas del historial se muestran en una columna
- **Y** el upload tiene CTA "Tomar foto"

**Escenario 2: Layout desktop (≥1024px)**
- **Dado** que abro la app en desktop
- **Cuando** se renderiza
- **Entonces** la navegación es sidebar o top-bar
- **Y** el historial se muestra en grilla de 2-3 columnas

**Escenario 3: Wireframes como guía**
- **Dado** que los wireframes están en `/docs/wireframes`
- **Cuando** implementamos las pantallas
- **Entonces** las implementaciones respetan las jerarquías y elementos definidos

---

## US-37 — Aplicar design system definido

**Story Points:** 3
**Prioridad MVP:** P1
**Épica:** E06

### Descripción
**Como** equipo,
**quiero** que toda la app use los componentes y tokens del design system definido,
**para** dar coherencia visual y acelerar la implementación.

### Criterios de aceptación

**Escenario 1: Tokens centralizados**
- **Dado** que existen los archivos del design system (colores, tipografía, espaciado)
- **Cuando** implementamos un componente
- **Entonces** usa variables CSS o tokens del design system, no colores/spacing hardcodeados

**Escenario 2: Componentes reutilizables**
- **Dado** que necesitamos botones, cards, badges (aptitud, riesgo) y estados de upload
- **Cuando** los implementamos
- **Entonces** viven en `/components/ui` y se reutilizan en todas las pantallas

**Escenario 3: Referencia en docs**
- **Dado** que un dev necesita ver el design system
- **Cuando** abre `/docs/design-system`
- **Entonces** ve las capturas de Header, DesignSystem y Components como referencia

---

## US-38 — Dataset mockeado para demo estable

**Story Points:** 2
**Prioridad MVP:** P1
**Épica:** E06

### Descripción
**Como** equipo,
**quiero** tener entre 20 y 40 productos precargados (mockeados) en la base,
**para** que la demo del TP sea estable y muestre todas las categorías.

### Criterios de aceptación

**Escenario 1: Seed de productos**
- **Dado** que existe un script `seed.ts` con 20-40 productos
- **Cuando** se ejecuta `npm run seed`
- **Entonces** los productos quedan persistidos en la base con todos los campos completos

**Escenario 2: Cobertura de categorías**
- **Dado** que ejecuté el seed
- **Cuando** consulto el historial
- **Entonces** veo al menos un producto por cada categoría definida (galletitas, cereales, snacks, lácteos, bebidas, sin TACC, veganos)

**Escenario 3: Cobertura de riesgos**
- **Dado** que ejecuté el seed
- **Cuando** filtro por riesgo
- **Entonces** existen productos de riesgo bajo, medio y alto en cantidades razonables

---

## US-39 — Tiempo de análisis razonable para la demo

**Story Points:** 2
**Prioridad MVP:** P1
**Épica:** E06

### Descripción
**Como** equipo,
**quiero** que el análisis end-to-end tarde menos de un umbral aceptable para la demo,
**para** que la presentación no se cuelgue.

### Criterios de aceptación

**Escenario 1: Tiempo bajo umbral**
- **Dado** que se ejecuta un análisis sobre una imagen típica
- **Cuando** se mide el tiempo end-to-end
- **Entonces** termina en menos de 20 segundos en el 95% de los casos de prueba

**Escenario 2: Fallback rápido**
- **Dado** que el modelo no responde rápido
- **Cuando** se supera el umbral configurado
- **Entonces** el sistema corta y muestra opción "Reintentar" en lugar de quedarse esperando
