import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Hola</Button>);
    expect(screen.getByRole('button', { name: 'Hola' })).toBeInTheDocument();
  });

  it('default variant is primary', () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-primary');
  });

  it('variant primary has primary background', () => {
    render(<Button variant="primary">Primario</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-primary');
  });

  it('variant ghost has transparent background and border', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('bg-transparent');
    expect(btn).toHaveClass('border');
  });

  it('variant danger has danger background', () => {
    render(<Button variant="danger">Eliminar</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-danger');
  });

  it('size sm applies sm classes', () => {
    render(<Button size="sm">Chico</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-4');
  });

  it('size md is default', () => {
    render(<Button>Mediano</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-6');
  });

  it('size lg applies lg classes', () => {
    render(<Button size="lg">Grande</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-8');
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Acción</Button>);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Deshabilitado</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Bloqueado
      </Button>,
    );
    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('forwards additional className', () => {
    render(<Button className="custom-class">Btn</Button>);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('has rounded-full shape', () => {
    render(<Button>Btn</Button>);
    expect(screen.getByRole('button')).toHaveClass('rounded-full');
  });

  it('forwards extra HTML attributes', () => {
    render(<Button data-testid="my-btn">Btn</Button>);
    expect(screen.getByTestId('my-btn')).toBeInTheDocument();
  });
});
