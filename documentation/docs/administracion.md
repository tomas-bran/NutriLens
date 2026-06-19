---
sidebar_position: 4
title: Administración
description: Funciones exclusivas de administradores — renombrar, eliminar y NutriWorld.
---

# Administración

Algunas funciones están reservadas a **administradores** (cuentas en la whitelist). El resto de los usuarios no las ve.

## Renombrar un producto

En la **ficha de un producto**, abajo, los admins ven el panel **"Administrar producto"**:

1. Editá el campo **Nombre**.
2. Tocá **Guardar nombre**.

El cambio se refleja en el catálogo y en el chat. El producto es una base compartida, así que el nuevo nombre lo ven todos.

## Eliminar un producto (soft delete)

En el mismo panel, **Eliminar producto** pide confirmación y luego lo borra.

:::info Es un borrado "soft"
El producto **no se elimina físicamente**: se marca como borrado. Por eso:

- Desaparece del **catálogo**, del **detalle**, del **chat** y de los **conteos**.
- Si un usuario lo tenía en **"Analizados por vos"**, ese conteo **baja** (deja de aparecer).
- Si más adelante alguien **re-analiza** el mismo producto (mismo archivo), se **restaura** automáticamente.
  :::

## Acceso a NutriWorld

**[NutriWorld](/funcionalidades/nutriworld)** es beta y **solo admins**:

- Para los no-admins, el ítem **no aparece** en el menú.
- La ruta `/nutriworld` no está disponible para ellos.
- En la demo se presenta entrando como administrador.

## ¿Quién es administrador?

La condición de admin se resuelve por una **whitelist de cuentas** en el servidor. No es algo que se active desde la UI.
