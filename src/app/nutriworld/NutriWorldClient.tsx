'use client';

/**
 * Frontera client de NutriWorld. Importa la experiencia 3D con `ssr: false`
 * (WebGL/Three.js no puede renderizar en el server) — por eso vive en un client
 * component: `next/dynamic` con `ssr: false` no se permite desde server.
 */
import nextDynamic from 'next/dynamic';
import { NutriWorldLoadingScreen } from '@/features/nutriworld/NutriWorldLoadingScreen';

const NutriWorldExperience = nextDynamic(
  () => import('@/features/nutriworld/NutriWorldExperience').then((m) => m.NutriWorldExperience),
  {
    ssr: false,
    // Fase de descarga del chunk 3D: mismo logo, barra indeterminada.
    loading: () => (
      <div className="relative h-[100dvh] w-full">
        <NutriWorldLoadingScreen indeterminate />
      </div>
    ),
  },
);

export function NutriWorldClient() {
  return <NutriWorldExperience />;
}
