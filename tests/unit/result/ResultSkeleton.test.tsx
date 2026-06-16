import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResultSkeleton } from '@/components/result/ResultSkeleton';
import AnalizarLoading from '@/app/analizar/[id]/loading';
import CatalogoLoading from '@/app/catalogo/[id]/loading';

describe('<ResultSkeleton> + loading fallbacks de resultado/detalle', () => {
  it('renderiza la silueta del resultado', () => {
    render(<ResultSkeleton />);
    expect(screen.getByTestId('result-skeleton')).toBeInTheDocument();
  });

  it('el loading de /analizar/[id] muestra el skeleton dentro del shell', () => {
    render(<AnalizarLoading />);
    expect(screen.getByTestId('result-skeleton')).toBeInTheDocument();
  });

  it('el loading de /catalogo/[id] muestra el skeleton dentro del shell', () => {
    render(<CatalogoLoading />);
    expect(screen.getByTestId('result-skeleton')).toBeInTheDocument();
  });
});
