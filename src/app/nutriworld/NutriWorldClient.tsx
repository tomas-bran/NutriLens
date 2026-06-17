'use client';

/**
 * Frontera client de NutriWorld. Importa la experiencia 3D con `ssr: false`
 * (WebGL/Three.js no puede renderizar en el server) — por eso vive en un client
 * component: `next/dynamic` con `ssr: false` no se permite desde server.
 */
import nextDynamic from 'next/dynamic';

const NutriWorldExperience = nextDynamic(
  () => import('@/features/nutriworld/NutriWorldExperience').then((m) => m.NutriWorldExperience),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-[#eef3ef] text-sm text-[var(--color-text-muted)]">
        Cargando NutriWorld…
      </div>
    ),
  },
);

export function NutriWorldClient() {
  return <NutriWorldExperience />;
}
