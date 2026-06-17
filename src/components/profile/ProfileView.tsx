'use client';

/**
 * <ProfileView> (NL-201, rediseño) — "Mi cuenta": tarjeta de perfil con datos
 * del usuario logueado + stats, preferencias por dieta (toggles) y accesos a
 * Mis análisis / Ayuda / Cerrar sesión.
 *
 * Las preferencias viven en cliente (localStorage) por ahora — su persistencia
 * por usuario es NL-208. El logout usa la server action `signOutAction`.
 * Responsive: una columna en mobile, dos en desktop.
 */
import Image from 'next/image';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { signOutAction } from '@/lib/auth/actions';
import { saveMyPrefs } from '@/lib/prefs/actions';
import type { DietPrefs } from '@/lib/prefs/server';
import { HelpSection } from './HelpView';

export interface ProfileUser {
  name: string;
  email: string;
  image: string | null;
}

export interface ProfileStats {
  analizados: number;
  riesgoAlto: number;
  sinAlergenos: number;
}

export function ProfileView({
  user,
  stats,
  initialPrefs,
}: {
  user: ProfileUser;
  stats: ProfileStats;
  initialPrefs: DietPrefs;
}) {
  const [prefs, setPrefs] = useState<DietPrefs>(initialPrefs);
  const [, startTransition] = useTransition();

  // NL-208: optimista en cliente + persistencia por usuario vía server action.
  const setPref = (k: keyof DietPrefs, v: boolean) => {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    startTransition(() => {
      void saveMyPrefs(next);
    });
  };

  return (
    <div className="flex flex-col gap-5 px-4 py-2 md:px-6 md:py-6">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
      >
        <Icon name="arrow-left" className="h-4 w-4" />
        Volver al inicio
      </Link>

      <header className="flex flex-col gap-1">
        <p className="text-[13px] text-[var(--color-text-muted)]">Perfil</p>
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-[var(--color-text)]">
          Mi cuenta
        </h1>
      </header>

      <ProfileCard user={user} stats={stats} />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[1.2fr_1fr] md:items-start">
        <PrefsCard prefs={prefs} setPref={setPref} />
        <LinksCard analizados={stats.analizados} />
      </div>

      {/* Divider entre la cuenta y la ayuda — ambas viven en la misma página. */}
      <hr className="my-3 border-t border-[var(--color-border)]" />

      <HelpSection />
    </div>
  );
}

function ProfileCard({ user, stats }: { user: ProfileUser; stats: ProfileStats }) {
  const initial = (user.name || user.email || '?').trim().charAt(0).toUpperCase();
  const items = [
    { n: stats.analizados, l: 'Analizados' },
    { n: stats.riesgoAlto, l: 'Riesgo alto' },
    { n: stats.sinAlergenos, l: 'Sin alérgenos' },
  ];
  return (
    <section className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-white p-6">
      <div className="home-gradient absolute inset-x-0 top-0 h-16 opacity-15" />
      <div className="relative flex items-center gap-4">
        {user.image ? (
          <Image
            src={user.image}
            alt=""
            width={72}
            height={72}
            className="h-[72px] w-[72px] flex-shrink-0 rounded-full object-cover shadow-[0_8px_20px_rgba(22,163,74,0.28)]"
          />
        ) : (
          <span className="home-gradient flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center rounded-full text-3xl font-bold text-white shadow-[0_8px_20px_rgba(22,163,74,0.28)]">
            {initial}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[22px] font-extrabold tracking-tight text-[var(--color-text)]">
            {user.name || 'Mi cuenta'}
          </div>
          <div className="truncate text-[13.5px] text-[var(--color-text-muted)]">{user.email}</div>
        </div>
      </div>
      <div className="relative mt-5 grid grid-cols-3 gap-2.5">
        {items.map((s) => (
          <div key={s.l} className="rounded-2xl bg-[var(--color-surface)] px-1.5 py-3 text-center">
            <div className="font-mono text-2xl font-extrabold text-[var(--color-primary-strong)]">
              {s.n}
            </div>
            <div className="mt-0.5 text-[11.5px] font-semibold text-[var(--color-text-muted)]">
              {s.l}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PrefsCard({
  prefs,
  setPref,
}: {
  prefs: DietPrefs;
  setPref: (k: keyof DietPrefs, v: boolean) => void;
}) {
  return (
    <section className="rounded-3xl border border-[var(--color-border)] bg-white px-5 py-5">
      <div className="text-[15.5px] font-bold text-[var(--color-text)]">Mis preferencias</div>
      <p className="mb-2 text-[12.5px] text-[var(--color-text-muted)]">
        Resaltamos en cada análisis lo que te importa.
      </p>
      <PrefRow
        icon="vegan"
        label="Dieta vegana"
        desc="Avisar si contiene origen animal"
        on={prefs.vegano}
        onChange={(v) => setPref('vegano', v)}
      />
      <PrefRow
        icon="wheat-off"
        label="Sin gluten (celíaco)"
        desc="Avisar si contiene gluten"
        on={prefs.celiaco}
        onChange={(v) => setPref('celiaco', v)}
      />
      <PrefRow
        icon="milk-off"
        label="Sin lactosa"
        desc="Avisar si contiene lácteos"
        on={prefs.lactosa}
        onChange={(v) => setPref('lactosa', v)}
      />
      <PrefRow
        icon="triangle-alert"
        label="Avisos de riesgo alto"
        desc="Notificarme cuando un producto sea de riesgo alto"
        on={prefs.avisos}
        onChange={(v) => setPref('avisos', v)}
        last
      />
    </section>
  );
}

function PrefRow({
  icon,
  label,
  desc,
  on,
  onChange,
  last,
}: {
  icon: IconName;
  label: string;
  desc: string;
  on: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 py-3 ${last ? '' : 'border-b border-[var(--color-border)]'}`}
    >
      <span
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-colors duration-300 ease-out ${on ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'}`}
      >
        <Icon name={icon} className="h-[19px] w-[19px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-semibold text-[var(--color-text)]">{label}</div>
        <div className="text-[12.5px] text-[var(--color-text-muted)]">{desc}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`relative flex h-7 w-12 flex-shrink-0 items-center rounded-full p-0.5 transition-colors duration-300 ease-out ${on ? 'bg-[var(--color-primary)]' : 'bg-[#e4eae0]'}`}
      >
        {/* Knob animado con transform (transición suave, no salta como justify). */}
        <span
          className="h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{ transform: on ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  );
}

function LinksCard({ analizados }: { analizados: number }) {
  // La ayuda vive en esta misma página: scrolleamos a la sección #ayuda.
  const scrollToAyuda = () => {
    document.getElementById('ayuda')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <section className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-white">
      <LinkRow
        href="/catalogo?filtro=mios"
        icon="salad"
        title="Mis análisis"
        desc={`${analizados} productos guardados`}
      />
      <RowButton
        icon="info"
        chevron="chevron-down"
        title="Ayuda y preguntas frecuentes"
        desc="Cómo funciona NutriLens"
        onClick={scrollToAyuda}
      />
      <form action={signOutAction}>
        <button
          type="submit"
          data-testid="logout"
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[var(--color-danger)] transition-colors hover:bg-[#fef2f2]"
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#fef2f2] text-[var(--color-danger)]">
            <Icon name="logout" className="h-[18px] w-[18px]" />
          </span>
          <span className="flex-1 text-[14.5px] font-bold">Cerrar sesión</span>
        </button>
      </form>
    </section>
  );
}

function LinkRow({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: IconName;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3.5 transition-colors hover:bg-[var(--color-surface)]"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface)] text-[var(--color-primary)]">
        <Icon name={icon} className="h-[19px] w-[19px]" />
      </span>
      <div className="flex-1">
        <div className="text-[14.5px] font-semibold text-[var(--color-text)]">{title}</div>
        <div className="text-[12.5px] text-[var(--color-text-muted)]">{desc}</div>
      </div>
      <Icon name="chevron-right" className="h-[18px] w-[18px] text-[var(--color-text-muted)]" />
    </Link>
  );
}

function RowButton({
  icon,
  chevron,
  title,
  desc,
  onClick,
}: {
  icon: IconName;
  chevron: IconName;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-[var(--color-border)] px-4 py-3.5 text-left transition-colors hover:bg-[var(--color-surface)]"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface)] text-[var(--color-primary)]">
        <Icon name={icon} className="h-[19px] w-[19px]" />
      </span>
      <div className="flex-1">
        <div className="text-[14.5px] font-semibold text-[var(--color-text)]">{title}</div>
        <div className="text-[12.5px] text-[var(--color-text-muted)]">{desc}</div>
      </div>
      <Icon name={chevron} className="h-[18px] w-[18px] text-[var(--color-text-muted)]" />
    </button>
  );
}
