/**
 * Unit tests for <BarcodeWarningBanner> (NL-601 — validación soft).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BarcodeWarningBanner } from '@/components/result/BarcodeWarningBanner';

describe('<BarcodeWarningBanner>', () => {
  it('muestra el aviso de mismatch (código de otro producto)', () => {
    render(<BarcodeWarningBanner barcodeMismatch />);
    expect(screen.getByTestId('barcode-warning-banner')).toBeInTheDocument();
    expect(screen.getByText(/parece ser de otro producto/i)).toBeInTheDocument();
  });

  it('muestra el aviso de "no pudimos leer" cuando solo es unreadable', () => {
    render(<BarcodeWarningBanner barcodeUnreadable />);
    expect(screen.getByText(/No pudimos leer el código de barras/i)).toBeInTheDocument();
  });

  it('prioriza el mismatch sobre el unreadable', () => {
    render(<BarcodeWarningBanner barcodeMismatch barcodeUnreadable />);
    expect(screen.getByText(/parece ser de otro producto/i)).toBeInTheDocument();
    expect(screen.queryByText(/No pudimos leer/i)).not.toBeInTheDocument();
  });

  it('no renderiza nada cuando no hay aviso', () => {
    render(<BarcodeWarningBanner />);
    expect(screen.queryByTestId('barcode-warning-banner')).not.toBeInTheDocument();
  });
});
