import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// Este archivo corre en Node.js — sin APIs de browser ni JSX acá.

const config: Config = {
  title: 'NutriLens',
  tagline: 'Entendé qué comés en segundos',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://docs.nutrilens.app',
  baseUrl: '/',

  organizationName: 'tomas-bran',
  projectName: 'NutriLens',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'es',
    locales: ['es'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          // Documentación en la raíz del sitio (sin /docs).
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/tomas-bran/NutriLens/tree/main/documentation/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/screens/home.png',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'NutriLens',
      logo: {
        alt: 'NutriLens',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentación',
        },
        {
          href: 'https://nutrilens-app.azurewebsites.net',
          label: 'Abrir la app',
          position: 'right',
        },
        {
          href: 'https://github.com/tomas-bran/NutriLens',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentación',
          items: [
            { label: 'Bienvenida', to: '/' },
            { label: 'Primeros pasos', to: '/primeros-pasos' },
            { label: 'Analizar un producto', to: '/funcionalidades/analizar' },
          ],
        },
        {
          title: 'Producto',
          items: [
            { label: 'Catálogo', to: '/funcionalidades/catalogo' },
            { label: 'Chat con IA', to: '/funcionalidades/chat' },
            { label: 'NutriWorld (beta)', to: '/funcionalidades/nutriworld' },
          ],
        },
        {
          title: 'Más',
          items: [
            { label: 'Abrir la app', href: 'https://nutrilens-app.azurewebsites.net' },
            { label: 'GitHub', href: 'https://github.com/tomas-bran/NutriLens' },
          ],
        },
      ],
      copyright: `NutriLens — IA Aplicada · UNLaM. © ${new Date().getFullYear()}. NutriLens es un asistente informativo, no reemplaza el consejo de un profesional de la salud.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
