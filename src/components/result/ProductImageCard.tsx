import Image from 'next/image';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import type { ProductDetail } from '@/lib/products/serializers';

export function ProductImageCard({ product }: { product: ProductDetail }) {
  const confidence = Math.round(product.confidence * 100);
  return (
    <Card
      padding="md"
      className="flex flex-col items-center gap-4"
      data-testid="product-image-card"
    >
      <div className="flex h-44 w-44 items-center justify-center rounded-[16px] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        {product.imagenUrl ? (
          <Image
            src={product.imagenUrl}
            alt={`Foto de ${product.nombre}`}
            width={176}
            height={176}
            unoptimized
            className="h-44 w-44 rounded-[16px] object-cover"
          />
        ) : (
          <Icon name="scan-eye" className="h-16 w-16" />
        )}
      </div>
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-success-bg)] px-3 py-1 text-[11px] font-bold text-[var(--color-primary-strong)]"
        data-testid="confidence-pill"
      >
        <Icon name="sparkles" className="h-3 w-3" strokeWidth={0} fill="currentColor" />
        Confianza {confidence}%
      </span>
    </Card>
  );
}
