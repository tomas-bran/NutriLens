/**
 * Unit tests for the <UploadFlow> component.
 * Covers the state-driven render branches without exercising the full
 * XHR pipeline (that's covered by the E2E specs).
 */
import { fireEvent, render as rtlRender, screen, waitFor, within } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/ui/Toaster';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn() }),
}));

import { UploadFlow } from '@/components/upload/UploadFlow';

// <UploadFlow> calls useToast(); every render needs to be wrapped.
function render(ui: ReactElement, options?: RenderOptions) {
  return rtlRender(ui, { wrapper: ToastProvider, ...options });
}

function mkFile(name: string, type: string, size = 1024): File {
  return new File([new Uint8Array(size)], name, { type });
}

afterEach(() => {
  pushMock.mockReset();
});

describe('<UploadFlow> — IDLE', () => {
  it('renders the dropzone with prompt text', () => {
    render(<UploadFlow />);
    expect(screen.getByTestId('dropzone')).toBeInTheDocument();
    expect(screen.getByText(/Arrastrá una foto o PDF/i)).toBeInTheDocument();
  });

  it('renders the 3 upload CTAs from wireframe D01 (Cámara / Galería / PDF)', () => {
    render(<UploadFlow />);
    expect(screen.getByTestId('upload-cta-group')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cámara/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Galería/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /PDF/ })).toBeInTheDocument();
  });

  it('exposes 3 distinct file inputs with the right accept semantics', () => {
    render(<UploadFlow />);
    const camera = screen.getByLabelText('Tomar foto con la cámara') as HTMLInputElement;
    const gallery = screen.getByLabelText('Subir foto o PDF') as HTMLInputElement;
    const pdf = screen.getByLabelText('Subir PDF') as HTMLInputElement;
    expect(camera).toHaveAttribute('accept', 'image/*');
    expect(camera).toHaveAttribute('capture', 'environment');
    expect(gallery).toHaveAttribute('accept', 'image/jpeg,image/png');
    expect(pdf).toHaveAttribute('accept', 'application/pdf');
  });
});

describe('<UploadFlow> — selecting a valid file', () => {
  it('shows "Archivo cargado" + filename + "Analizar producto" button', async () => {
    const user = userEvent.setup();
    render(<UploadFlow />);
    const input = screen.getByLabelText('Subir foto o PDF') as HTMLInputElement;
    await user.upload(input, mkFile('etiqueta.jpg', 'image/jpeg'));

    expect(screen.getByText('Archivo cargado')).toBeInTheDocument();
    expect(screen.getByText('etiqueta.jpg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analizar producto' })).toBeInTheDocument();
  });

  it('"Elegir otro archivo" goes back to IDLE', async () => {
    const user = userEvent.setup();
    render(<UploadFlow />);
    const input = screen.getByLabelText('Subir foto o PDF') as HTMLInputElement;
    await user.upload(input, mkFile('etiqueta.jpg', 'image/jpeg'));

    await user.click(screen.getByRole('button', { name: 'Elegir otro archivo' }));

    expect(screen.queryByText('Archivo cargado')).not.toBeInTheDocument();
    expect(screen.getByText(/Arrastrá una foto o PDF/i)).toBeInTheDocument();
  });
});

/**
 * Drops a file directly onto a file input via fireEvent.change. We bypass
 * userEvent.upload for invalid-file cases because its accept-attribute
 * filtering interferes with simulating "user picked a bad file."
 */
function dropFileOnInput(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, 'files', {
    value: [file],
    configurable: true,
  });
  fireEvent.change(input);
}

describe('<UploadFlow> — client-side rejection (US-06 + spec §9)', () => {
  it('shows ErrorState with "Formato no soportado" when selecting a .docx', () => {
    render(<UploadFlow />);
    const input = screen.getByLabelText('Subir foto o PDF') as HTMLInputElement;

    dropFileOnInput(
      input,
      mkFile('doc.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    );

    expect(screen.getByRole('heading', { name: 'Formato no soportado' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Probar con otro archivo' })).toBeInTheDocument();
  });

  it('shows ErrorState "Archivo muy grande" when selecting a >10MB file', () => {
    render(<UploadFlow />);
    const input = screen.getByLabelText('Subir foto o PDF') as HTMLInputElement;

    dropFileOnInput(input, mkFile('big.jpg', 'image/jpeg', 11 * 1024 * 1024));

    // Scope assertions to the ErrorState region so we don't collide with the
    // toast that mirrors the same copy.
    const heading = screen.getByRole('heading', { name: 'Archivo muy grande' });
    expect(heading).toBeInTheDocument();
    const errorRegion = heading.closest('[role="status"]') as HTMLElement | null;
    expect(errorRegion).not.toBeNull();
    if (errorRegion) {
      expect(within(errorRegion).getByText(/10 MB/)).toBeInTheDocument();
    }
  });

  it('shows ErrorState "Archivo vacío" when selecting a 0-byte file', () => {
    render(<UploadFlow />);
    const input = screen.getByLabelText('Subir foto o PDF') as HTMLInputElement;

    dropFileOnInput(input, mkFile('empty.jpg', 'image/jpeg', 0));

    expect(screen.getByRole('heading', { name: 'Archivo vacío' })).toBeInTheDocument();
  });

  it('"Probar con otro archivo" returns to IDLE dropzone', async () => {
    const user = userEvent.setup();
    render(<UploadFlow />);
    const input = screen.getByLabelText('Subir foto o PDF') as HTMLInputElement;

    dropFileOnInput(input, mkFile('doc.txt', 'text/plain'));
    expect(screen.getByRole('heading', { name: 'Formato no soportado' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Probar con otro archivo' }));

    expect(screen.queryByRole('heading', { name: 'Formato no soportado' })).not.toBeInTheDocument();
    expect(screen.getByTestId('dropzone')).toBeInTheDocument();
  });
});

describe('<UploadFlow> — focus management (a11y)', () => {
  it('moves focus to the ErrorState heading when ERROR appears', async () => {
    render(<UploadFlow />);
    const input = screen.getByLabelText('Subir foto o PDF') as HTMLInputElement;

    dropFileOnInput(input, mkFile('doc.txt', 'text/plain'));

    const heading = screen.getByRole('heading', { name: 'Formato no soportado' });
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });
});

describe('<UploadFlow> — SELECTED preview (wireframe D01)', () => {
  it('shows file size and MIME alongside the filename', async () => {
    const user = userEvent.setup();
    render(<UploadFlow />);
    const input = screen.getByLabelText('Subir foto o PDF') as HTMLInputElement;
    await user.upload(input, mkFile('etiqueta.jpg', 'image/jpeg', 2048));

    expect(screen.getByTestId('selected-file')).toBeInTheDocument();
    expect(screen.getByText('etiqueta.jpg')).toBeInTheDocument();
    expect(screen.getByText(/2\.0 KB/)).toBeInTheDocument();
    expect(screen.getByText(/image\/jpeg/)).toBeInTheDocument();
  });
});

// NL-501: paste image support
describe('<UploadFlow> — paste image (NL-501)', () => {
  function makePasteEvent(file: File | null) {
    const dataTransfer = {
      items: file ? [{ type: file.type, getAsFile: () => file } as DataTransferItem] : [],
    } as unknown as DataTransfer;
    return new ClipboardEvent('paste', { clipboardData: dataTransfer, bubbles: true });
  }

  it('selects the pasted image and shows SELECTED state', async () => {
    render(<UploadFlow />);
    expect(screen.getByTestId('dropzone')).toBeInTheDocument();

    const file = mkFile('pasted.png', 'image/png', 2048);
    document.dispatchEvent(makePasteEvent(file));

    await waitFor(() => {
      expect(screen.getByTestId('selected-file')).toBeInTheDocument();
    });
    expect(screen.getByText('pasted.png')).toBeInTheDocument();
  });

  it('rejects a pasted non-image (text/plain) and stays in IDLE', () => {
    render(<UploadFlow />);

    const textFile = mkFile('note.txt', 'text/plain', 100);
    const event = makePasteEvent(textFile);
    // Override the item type to text/plain so the paste handler skips it
    (event.clipboardData!.items[0] as unknown as { type: string }).type = 'text/plain';
    document.dispatchEvent(event);

    expect(screen.getByTestId('dropzone')).toBeInTheDocument();
    expect(screen.queryByTestId('selected-file')).not.toBeInTheDocument();
  });

  it('ignores paste events with no items', () => {
    render(<UploadFlow />);
    document.dispatchEvent(makePasteEvent(null));
    expect(screen.getByTestId('dropzone')).toBeInTheDocument();
  });

  it('replaces a previously selected file when pasting again', async () => {
    render(<UploadFlow />);
    const file1 = mkFile('first.jpg', 'image/jpeg', 1024);
    document.dispatchEvent(makePasteEvent(file1));
    await waitFor(() => expect(screen.getByText('first.jpg')).toBeInTheDocument());

    const file2 = mkFile('second.png', 'image/png', 2048);
    document.dispatchEvent(makePasteEvent(file2));
    await waitFor(() => expect(screen.getByText('second.png')).toBeInTheDocument());
    expect(screen.queryByText('first.jpg')).not.toBeInTheDocument();
  });
});
