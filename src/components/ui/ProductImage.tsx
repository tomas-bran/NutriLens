'use client';

/**
 * <ProductImage> — thumbnail de producto con fallback a un ícono de comida.
 *
 * El placeholder no alcanza con "url vacía": el seed (y cualquier imagen que
 * 404ee) tiene URL pero no carga, dejando el ícono roto del navegador. Por eso
 * usamos `onError` (de ahí que sea client component) para caer al ícono de
 * ensalada genérico cuando la imagen no se puede mostrar.
 */
import Image from 'next/image';
import { useState } from 'react';
import { Icon } from './Icon';
import { cn } from '@/lib/cn';

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  /** Clases del wrapper (tamaño + radio). El wrapper ya trae el bg del placeholder. */
  className?: string;
  /** Tamaño del ícono de fallback. */
  iconClassName?: string;
  sizes?: string;
}

export function ProductImage({
  src,
  alt,
  className,
  iconClassName = 'h-10 w-10',
  sizes,
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[var(--color-primary-soft)] to-[var(--color-surface)] text-[var(--color-primary)]',
        className,
      )}
    >
      {showImage ? (
        <Image
          src={src as string}
          alt={alt}
          fill
          unoptimized
          sizes={sizes}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Icon name="salad" className={iconClassName} aria-hidden="true" />
      )}
    </div>
  );
}
