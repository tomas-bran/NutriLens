'use client';

/**
 * <ImageLightbox> — miniatura de la foto del producto que, al hacer click, abre
 * un visor a pantalla completa (overlay) para verla en grande. Se cierra con
 * click en el fondo, con Escape o con el botón ✕.
 */
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

export function ImageLightbox({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="product-image-open"
        aria-label="Ver la imagen en grande"
        className="group relative h-44 w-44 overflow-hidden rounded-[16px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
      >
        <Image
          src={src}
          alt={alt}
          width={176}
          height={176}
          unoptimized
          className="h-44 w-44 object-cover"
        />
        {/* affordance de zoom */}
        <span className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <Icon name="scan-eye" className="h-4 w-4" />
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
        >
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
          >
            <Icon name="close" className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <Image
            src={src}
            alt={alt}
            width={1200}
            height={1200}
            unoptimized
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
