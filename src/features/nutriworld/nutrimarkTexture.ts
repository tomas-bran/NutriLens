/**
 * El logo de NutriLens (NutriMark) como data-URL SVG, listo para cargar como
 * textura en el 3D (`useTexture`). Replica el glyph del componente
 * `src/components/ui/NutriMark.tsx` pero horneado sobre un disco blanco para que
 * lea bien sobre el cuerpo verde del robot (pecho/espalda). Colores de marca.
 */
const NUTRIMARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="15" fill="#ffffff"/>
  <circle cx="16" cy="16" r="12.4" stroke="#16a34a" stroke-width="1.7" fill="none" opacity="0.45"/>
  <path d="M8.6 23.4C8.2 14.6 13.4 8.8 23.4 8.6 23.8 17.4 18.6 23.2 8.6 23.4Z" fill="#16a34a"/>
  <path d="M11.4 20.6C14.8 16.4 17.8 13.4 20.4 11.6" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/>
  <circle cx="24.6" cy="7.4" r="2.1" fill="#a3e635"/>
</svg>`;

export const NUTRIMARK_TEXTURE_URL = `data:image/svg+xml;utf8,${encodeURIComponent(NUTRIMARK_SVG)}`;
