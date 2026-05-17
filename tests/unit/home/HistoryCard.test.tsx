import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HistoryCard } from '@/components/home/HistoryCard';

describe('<HistoryCard>', () => {
  it('renders the heading "Tu historial"', () => {
    render(<HistoryCard count={5} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Tu historial' })).toBeInTheDocument();
  });

  it('uses singular copy when count is 1', () => {
    render(<HistoryCard count={1} />);
    expect(screen.getByText('Ya analizaste 1 producto.')).toBeInTheDocument();
  });

  it('uses plural copy when count > 1', () => {
    render(<HistoryCard count={24} />);
    expect(screen.getByText('Ya analizaste 24 productos.')).toBeInTheDocument();
  });

  it('exposes a link to /historial', () => {
    render(<HistoryCard count={3} />);
    const cta = screen.getByTestId('history-cta');
    expect(cta).toHaveAttribute('href', '/historial');
    expect(cta).toHaveTextContent(/Ver historial/);
  });
});
