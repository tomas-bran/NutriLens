'use client';

/**
 * <HelpView> (rediseño) — Ayuda: FAQ acordeón + contacto. Copy orientado al
 * usuario, sin tecnicismos (no menciona modelos/implementación). Client por el
 * estado abierto/cerrado de cada item.
 */
import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';

const FAQS = [
  {
    q: '¿Qué es NutriLens?',
    a: 'Una app que lee la etiqueta de un alimento a partir de una foto o PDF y te explica en lenguaje claro sus alérgenos, sellos de advertencia y un nivel de riesgo.',
  },
  {
    q: '¿Cómo se calcula el riesgo?',
    a: 'Con reglas propias y transparentes sobre los datos detectados en la etiqueta: alérgenos presentes y sellos de advertencia.',
  },
  {
    q: '¿Es un consejo médico?',
    a: 'No. NutriLens es un asistente informativo: no reemplaza a un profesional de la salud ni la lectura del etiquetado oficial del producto.',
  },
  {
    q: '¿Cómo se guardan mis datos?',
    a: 'Tus análisis quedan asociados a tu cuenta para que puedas verlos en el historial y preguntar sobre ellos en el chat. Podés cerrar sesión cuando quieras.',
  },
  {
    q: '¿Qué tan precisa es la lectura?',
    a: 'Cada análisis incluye un nivel de confianza. Si la foto está borrosa o incompleta, te lo indicamos para que vuelvas a intentarlo con una imagen más clara.',
  },
];

export function HelpView() {
  const [open, setOpen] = useState(0);
  return (
    <div className="flex flex-col gap-5 px-4 py-2 md:max-w-3xl md:px-6 md:py-6">
      <header className="flex flex-col gap-1">
        <p className="text-[13px] text-[var(--color-text-muted)]">Ayuda</p>
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-[var(--color-text)]">
          ¿Cómo te ayudamos?
        </h1>
      </header>

      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-[var(--color-text-muted)]">
          Preguntas frecuentes
        </p>
        {FAQS.map((f, i) => (
          <FaqItem
            key={f.q}
            q={f.q}
            a={f.a}
            open={open === i}
            onClick={() => setOpen(open === i ? -1 : i)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3.5 rounded-2xl border border-[var(--color-primary-border)] bg-[var(--color-primary-soft)] p-5">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white text-[var(--color-primary)]">
          <Icon name="chat" className="h-[22px] w-[22px]" />
        </span>
        <div className="min-w-[180px] flex-1">
          <div className="text-[15px] font-bold text-[var(--color-text)]">
            ¿Necesitás más ayuda?
          </div>
          <div className="mt-0.5 text-[13px] text-[var(--color-primary-strong)]">
            Escribinos a hola@nutrilens.app
          </div>
        </div>
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-[var(--color-primary-strong)]"
        >
          <Icon name="chat" className="h-[17px] w-[17px]" />
          Abrir chat
        </Link>
      </div>
    </div>
  );
}

function FaqItem({
  q,
  a,
  open,
  onClick,
}: {
  q: string;
  a: string;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white">
      <button
        type="button"
        onClick={onClick}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-4 text-left"
      >
        <span className="flex-1 text-[14.5px] font-semibold text-[var(--color-text)]">{q}</span>
        <Icon
          name="chevron-down"
          className={`h-[18px] w-[18px] flex-shrink-0 text-[var(--color-text-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="text-[var(--color-text)]/80 px-4 pb-4 text-[13.5px] leading-relaxed">
          {a}
        </div>
      )}
    </div>
  );
}
