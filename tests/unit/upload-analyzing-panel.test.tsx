/**
 * Unit tests for <AnalyzingPanel> (NL-601 dual-scan view).
 * Cuando hay foto del código de barras, se escanean las dos fotos lado a lado.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AnalyzingPanel } from '@/components/upload/AnalyzingPanel';

function mkFile(name: string, type = 'image/jpeg'): File {
  return new File([new Uint8Array(8)], name, { type });
}

describe('<AnalyzingPanel>', () => {
  it('escanea una sola foto cuando no hay código de barras', () => {
    render(<AnalyzingPanel file={mkFile('producto.jpg')} progress={1} stage="PROCESSING" />);
    expect(screen.queryByTestId('dual-scan')).not.toBeInTheDocument();
    expect(screen.getByText('Analizando etiqueta')).toBeInTheDocument();
    expect(screen.getAllByTestId('analyzing-preview')).toHaveLength(1);
  });

  it('escanea las dos fotos cuando hay código de barras', () => {
    render(
      <AnalyzingPanel
        file={mkFile('producto.jpg')}
        barcodeFile={mkFile('codigo.jpg')}
        progress={1}
        stage="PROCESSING"
      />,
    );
    expect(screen.getByTestId('dual-scan')).toBeInTheDocument();
    expect(screen.getByText('Analizando las dos fotos')).toBeInTheDocument();
    expect(screen.getAllByTestId('analyzing-preview')).toHaveLength(2);
  });
});
