/**
 * Tests del <PipelineTrace> — render con trace válido (8 steps ok), un step
 * en error, status skipped, total, fallback en trace inválido y comportamiento
 * de colapsable. Spec E06 §3 (US-33).
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PipelineTrace, STEP_LABELS } from '@/components/result/PipelineTrace';
import type { StepTrace } from '@schemas/pipeline';

function step(overrides: Partial<StepTrace> & Pick<StepTrace, 'name'>): StepTrace {
  return {
    name: overrides.name,
    status: overrides.status ?? 'ok',
    startedAt: overrides.startedAt ?? '2026-05-18T10:00:00.000Z',
    durationMs: overrides.durationMs ?? 100,
    details: overrides.details,
  };
}

const HAPPY_TRACE: StepTrace[] = [
  step({ name: 'validate_file', durationMs: 12 }),
  step({ name: 'detect_label_kind', durationMs: 843 }),
  step({ name: 'extract_with_ia', durationMs: 4215 }),
  step({ name: 'validate_schema', durationMs: 3 }),
  step({ name: 'apply_rules', durationMs: 1 }),
  step({ name: 'compute_risk', durationMs: 1 }),
  step({ name: 'generate_explanation', durationMs: 1102 }),
  step({ name: 'persist', durationMs: 125 }),
];

describe('<PipelineTrace> — happy path con 8 steps ok (E06 §3.1)', () => {
  it('renderiza los 8 steps con sus labels amigables', () => {
    render(<PipelineTrace trace={HAPPY_TRACE} defaultOpen />);
    expect(screen.getByText(STEP_LABELS.validate_file)).toBeInTheDocument();
    expect(screen.getByText(STEP_LABELS.detect_label_kind)).toBeInTheDocument();
    expect(screen.getByText(STEP_LABELS.extract_with_ia)).toBeInTheDocument();
    expect(screen.getByText(STEP_LABELS.validate_schema)).toBeInTheDocument();
    expect(screen.getByText(STEP_LABELS.apply_rules)).toBeInTheDocument();
    expect(screen.getByText(STEP_LABELS.compute_risk)).toBeInTheDocument();
    expect(screen.getByText(STEP_LABELS.generate_explanation)).toBeInTheDocument();
    expect(screen.getByText(STEP_LABELS.persist)).toBeInTheDocument();
  });

  it('muestra status (data-status) ok en cada step', () => {
    render(<PipelineTrace trace={HAPPY_TRACE} defaultOpen />);
    const rows = screen.getAllByTestId(/^pipeline-step-/);
    expect(rows).toHaveLength(8);
    for (const r of rows) {
      expect(r.getAttribute('data-status')).toBe('ok');
    }
  });

  it('muestra duración por step (ms para < 1000, s para >= 1000)', () => {
    render(<PipelineTrace trace={HAPPY_TRACE} defaultOpen />);
    const validateFile = screen.getByTestId('pipeline-step-validate_file');
    expect(validateFile).toHaveTextContent('12 ms');
    const extract = screen.getByTestId('pipeline-step-extract_with_ia');
    // 4215ms → "4.21 s" (toFixed(2) trunca / rounds-half-to-even en JS).
    expect(extract).toHaveTextContent('4.21 s');
  });

  it('muestra el total como suma de durationMs', () => {
    render(<PipelineTrace trace={HAPPY_TRACE} defaultOpen />);
    // 12 + 843 + 4215 + 3 + 1 + 1 + 1102 + 125 = 6302ms → toFixed(2) = "6.30 s"
    const total = screen.getByTestId('pipeline-trace-total').textContent;
    expect(total).toMatch(/^6\.30 s$/);
  });
});

describe('<PipelineTrace> — step con error (E06 §3 escenario 2)', () => {
  it('marca el step con status="error" y muestra el mensaje de details.error', () => {
    const trace: StepTrace[] = [
      step({ name: 'validate_file', durationMs: 10 }),
      step({
        name: 'extract_with_ia',
        status: 'error',
        durationMs: 2400,
        details: { error: 'El modelo devolvió un JSON inválido tras el reintento.' },
      }),
    ];
    render(<PipelineTrace trace={trace} defaultOpen />);
    const errStep = screen.getByTestId('pipeline-step-extract_with_ia');
    expect(errStep.getAttribute('data-status')).toBe('error');
    expect(within(errStep).getByTestId('pipeline-step-error-msg')).toHaveTextContent(
      'El modelo devolvió un JSON inválido tras el reintento.',
    );
  });

  it('si details.error falta, cae a details.reason', () => {
    const trace: StepTrace[] = [
      step({
        name: 'persist',
        status: 'error',
        details: { reason: 'DB indisponible' },
      }),
    ];
    render(<PipelineTrace trace={trace} defaultOpen />);
    expect(screen.getByTestId('pipeline-step-error-msg')).toHaveTextContent('DB indisponible');
  });

  it('si no hay details, muestra mensaje genérico', () => {
    const trace: StepTrace[] = [step({ name: 'persist', status: 'error' })];
    render(<PipelineTrace trace={trace} defaultOpen />);
    expect(screen.getByTestId('pipeline-step-error-msg')).toHaveTextContent('Falló este paso.');
  });
});

describe('<PipelineTrace> — skipped', () => {
  it('renderea step skipped con data-status="skipped" y sin mensaje de error', () => {
    const trace: StepTrace[] = [step({ name: 'generate_explanation', status: 'skipped' })];
    render(<PipelineTrace trace={trace} defaultOpen />);
    const row = screen.getByTestId('pipeline-step-generate_explanation');
    expect(row.getAttribute('data-status')).toBe('skipped');
    expect(screen.queryByTestId('pipeline-step-error-msg')).not.toBeInTheDocument();
  });
});

describe('<PipelineTrace> — colapsable (E06 §3.4)', () => {
  it('respeta defaultOpen=true: cuerpo visible al render', () => {
    render(<PipelineTrace trace={HAPPY_TRACE} defaultOpen />);
    expect(screen.getByTestId('pipeline-trace-total')).toBeVisible();
  });

  it('defaultOpen=false: cuerpo oculto al render, toggle muestra', async () => {
    const user = userEvent.setup();
    render(<PipelineTrace trace={HAPPY_TRACE} defaultOpen={false} />);
    expect(screen.queryByTestId('pipeline-trace-total')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('pipeline-trace-toggle'));
    expect(screen.getByTestId('pipeline-trace-total')).toBeVisible();
  });

  it('aria-expanded refleja el estado', async () => {
    const user = userEvent.setup();
    render(<PipelineTrace trace={HAPPY_TRACE} defaultOpen={false} />);
    const toggle = screen.getByTestId('pipeline-trace-toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await user.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });
});

describe('<PipelineTrace> — trace inválido (defensa)', () => {
  it('null/undefined → no renderiza nada', () => {
    const { container: c1 } = render(<PipelineTrace trace={null} />);
    expect(c1).toBeEmptyDOMElement();
    const { container: c2 } = render(<PipelineTrace trace={undefined} />);
    expect(c2).toBeEmptyDOMElement();
  });

  it('array vacío → no renderiza nada', () => {
    const { container } = render(<PipelineTrace trace={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shape inválido (no array) → no renderiza nada', () => {
    const { container } = render(<PipelineTrace trace={{ algo: 'random' }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('array con items mal-formados → no renderiza nada', () => {
    const { container } = render(<PipelineTrace trace={[{ name: 'invalid_step' }]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
