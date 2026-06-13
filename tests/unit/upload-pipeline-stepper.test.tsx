import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PIPELINE_STEPS_COUNT, PipelineStepper } from '@/components/upload/PipelineStepper';

describe('<PipelineStepper>', () => {
  it('renders the section heading and 5 steps', () => {
    render(<PipelineStepper currentStepIndex={0} />);
    expect(screen.getByText('Pipeline en curso')).toBeInTheDocument();
    expect(screen.getByText('8–15s estimado')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(PIPELINE_STEPS_COUNT);
  });

  it('marks the current step as "active" and the rest as pending when index=0', () => {
    render(<PipelineStepper currentStepIndex={0} />);
    expect(screen.getByTestId('pipeline-step-validate')).toHaveAttribute('data-status', 'active');
    expect(screen.getByTestId('pipeline-step-extract')).toHaveAttribute('data-status', 'pending');
    expect(screen.getByTestId('pipeline-step-allergens')).toHaveAttribute('data-status', 'pending');
    expect(screen.getByTestId('pipeline-step-risk')).toHaveAttribute('data-status', 'pending');
    expect(screen.getByTestId('pipeline-step-explain')).toHaveAttribute('data-status', 'pending');
  });

  it('marks previous steps as "done" and the current as "active" when index=2', () => {
    render(<PipelineStepper currentStepIndex={2} />);
    expect(screen.getByTestId('pipeline-step-validate')).toHaveAttribute('data-status', 'done');
    expect(screen.getByTestId('pipeline-step-extract')).toHaveAttribute('data-status', 'done');
    expect(screen.getByTestId('pipeline-step-allergens')).toHaveAttribute('data-status', 'active');
    expect(screen.getByTestId('pipeline-step-risk')).toHaveAttribute('data-status', 'pending');
    expect(screen.getByTestId('pipeline-step-explain')).toHaveAttribute('data-status', 'pending');
  });

  it('marks every step as "done" when index >= total steps', () => {
    render(<PipelineStepper currentStepIndex={PIPELINE_STEPS_COUNT} />);
    expect(screen.getByTestId('pipeline-step-validate')).toHaveAttribute('data-status', 'done');
    expect(screen.getByTestId('pipeline-step-explain')).toHaveAttribute('data-status', 'done');
  });

  it('shows "Listo" on completed steps', () => {
    render(<PipelineStepper currentStepIndex={3} />);
    // 3 steps done (indices 0, 1, 2) → 3 "Listo" labels.
    expect(screen.getAllByText('Listo')).toHaveLength(3);
  });

  it('lists the canonical step titles from the spec/Pencil', () => {
    render(<PipelineStepper currentStepIndex={0} />);
    expect(screen.getByText('Validación de etiqueta')).toBeInTheDocument();
    expect(screen.getByText('Leyendo la etiqueta')).toBeInTheDocument();
    expect(screen.getByText('Clasificando alérgenos…')).toBeInTheDocument();
    expect(screen.getByText('Cálculo de riesgo')).toBeInTheDocument();
    expect(screen.getByText('Generar explicación + guardar')).toBeInTheDocument();
  });
});
