import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Chip } from '@/components/ui/Chip';

describe('Chip', () => {
  it('renders children', () => {
    render(<Chip>Gluten</Chip>);
    expect(screen.getByRole('button', { name: 'Gluten' })).toBeInTheDocument();
  });

  it('renders as a button element', () => {
    render(<Chip>Tag</Chip>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('has type=button to prevent form submit', () => {
    render(<Chip>Tag</Chip>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Chip onClick={onClick}>Filtro</Chip>);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('without onClick, still renders', () => {
    render(<Chip>Solo texto</Chip>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('removable shows × symbol', () => {
    render(<Chip removable>Alérgeno</Chip>);
    const btn = screen.getByRole('button');
    expect(btn.textContent).toContain('×');
  });

  it('non-removable does not show ×', () => {
    render(<Chip>Categoría</Chip>);
    const btn = screen.getByRole('button');
    expect(btn.textContent).not.toContain('×');
  });

  it('removable with string children has descriptive aria-label', () => {
    render(<Chip removable>Gluten</Chip>);
    expect(screen.getByRole('button', { name: 'Quitar Gluten' })).toBeInTheDocument();
  });

  it('removable chip triggers onClick on click', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Chip removable onClick={onClick}>
        Leche
      </Chip>,
    );
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('has rounded-full shape', () => {
    render(<Chip>x</Chip>);
    expect(screen.getByRole('button')).toHaveClass('rounded-full');
  });

  it('forwards className', () => {
    render(<Chip className="extra">x</Chip>);
    expect(screen.getByRole('button')).toHaveClass('extra');
  });

  it('forwards extra HTML attributes', () => {
    render(<Chip data-testid="chip-1">x</Chip>);
    expect(screen.getByTestId('chip-1')).toBeInTheDocument();
  });

  it('interactive chip has cursor-pointer class', () => {
    render(<Chip onClick={() => {}}>Filtro</Chip>);
    expect(screen.getByRole('button')).toHaveClass('cursor-pointer');
  });

  it('non-interactive chip has cursor-default class', () => {
    render(<Chip>Estatico</Chip>);
    expect(screen.getByRole('button')).toHaveClass('cursor-default');
  });
});
