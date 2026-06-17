'use client';

/**
 * Raíz client de NutriWorld: escena 3D a pantalla completa + capa de overlays
 * 2D por encima. Se importa con `ssr: false` (WebGL no puede renderizar en el
 * server). La capa de overlays es `pointer-events-none`; cada control reactiva
 * sus eventos para que el resto de los clicks lleguen al canvas.
 */
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { AssistantOverlay } from './AssistantOverlay';
import { HudControls } from './HudControls';
import { NutriWorldScene } from './NutriWorldScene';
import { ProductDetailPanel } from './ProductDetailPanel';

export function NutriWorldExperience() {
  return (
    <div
      className="relative h-[100dvh] w-full overflow-hidden bg-[#eef3ef]"
      data-testid="nutriworld"
    >
      <NutriWorldScene />

      <div className="pointer-events-none absolute inset-0">
        <Link
          href="/"
          data-testid="nutriworld-exit"
          className="pointer-events-auto absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-white/90 px-3 py-1.5 text-sm font-semibold text-[var(--color-text)] shadow-sm backdrop-blur transition-colors hover:text-[var(--color-primary)]"
        >
          <Icon name="arrow-left" className="h-4 w-4" />
          Salir de NutriWorld
        </Link>

        <HudControls />
        <AssistantOverlay />
        <ProductDetailPanel />
      </div>
    </div>
  );
}
