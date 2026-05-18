/**
 * Tests del <ProductChip> (US-32 §1+§2).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductChip } from '@/components/chat/ProductChip';
import type { ChatProductRef } from '@/lib/chat/response';

const baseProduct: ChatProductRef = {
  id: 'p-123',
  nombre: 'Galletitas Sin TACC X',
  categoria: 'galletitas',
  riesgo: 'bajo',
  imagenUrl: '/uploads/x.jpg',
};

describe('<ProductChip>', () => {
  it('muestra nombre y label de riesgo (US-32 §1)', () => {
    render(<ProductChip product={baseProduct} />);
    expect(screen.getByText('Galletitas Sin TACC X')).toBeInTheDocument();
    expect(screen.getByText('Riesgo bajo')).toBeInTheDocument();
  });

  it('linkea al detalle del producto (US-32 §2)', () => {
    render(<ProductChip product={baseProduct} />);
    const link = screen.getByTestId('chat-product-chip');
    expect(link.getAttribute('href')).toBe('/historial/p-123');
  });

  it('aria-label combina nombre + riesgo + acción', () => {
    render(<ProductChip product={baseProduct} />);
    const link = screen.getByTestId('chat-product-chip');
    expect(link.getAttribute('aria-label')).toBe(
      'Galletitas Sin TACC X — Riesgo bajo. Ver detalle del producto.',
    );
  });

  it('muestra el rank cuando se pasa', () => {
    render(<ProductChip product={baseProduct} rank={2} />);
    expect(screen.getByText('#2')).toBeInTheDocument();
  });

  it('oculta el rank cuando se omite', () => {
    render(<ProductChip product={baseProduct} />);
    expect(screen.queryByText(/^#/)).not.toBeInTheDocument();
  });

  it('riesgo medio usa label "Riesgo medio"', () => {
    render(<ProductChip product={{ ...baseProduct, riesgo: 'medio' }} />);
    expect(screen.getByText('Riesgo medio')).toBeInTheDocument();
  });

  it('riesgo alto usa label "Riesgo alto"', () => {
    render(<ProductChip product={{ ...baseProduct, riesgo: 'alto' }} />);
    expect(screen.getByText('Riesgo alto')).toBeInTheDocument();
  });
});
