/**
 * <LoginDecor> (redesign) — decoración del panel de marca del login:
 * estrellitas lima que titilan + un "scan-frame" de cámara con la línea que
 * escanea. Puramente decorativo (aria-hidden), CSS-animado (sin JS), con
 * posiciones fijas para que sea un server component sin hidration mismatch.
 * Las animaciones se neutralizan con prefers-reduced-motion (ver globals.css).
 */

const SPARKLES = [
  { top: '6%', left: '70%', size: 14, delay: '0s' },
  { top: '18%', left: '90%', size: 9, delay: '0.6s' },
  { top: '44%', left: '60%', size: 11, delay: '1.2s' },
  { top: '60%', left: '85%', size: 8, delay: '0.3s' },
  { top: '74%', left: '52%', size: 13, delay: '1.8s' },
  { top: '88%', left: '78%', size: 9, delay: '0.9s' },
  { top: '32%', left: '40%', size: 8, delay: '2.2s' },
  { top: '52%', left: '30%', size: 10, delay: '1.5s' },
];

export function LoginDecor() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {SPARKLES.map((s, i) => (
        <span
          key={i}
          className="nl-twinkle absolute"
          style={{ top: s.top, left: s.left, animationDelay: s.delay }}
        >
          <Sparkle size={s.size} />
        </span>
      ))}
      {/* Scan-frame de cámara, a la derecha (como el reticle del análisis). */}
      <div className="absolute right-[6%] top-[42%] hidden md:block">
        <ScanFrame size={150} />
      </div>
    </div>
  );
}

function Sparkle({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2c.6 4.5 2.9 6.8 7.4 7.4-4.5.6-6.8 2.9-7.4 7.4-.6-4.5-2.9-6.8-7.4-7.4C9.1 8.8 11.4 6.5 12 2z"
        fill="var(--color-accent-lime)"
        transform="translate(0 1.3) scale(1 1)"
      />
    </svg>
  );
}

function ScanFrame({ size }: { size: number }) {
  const corner = 'absolute h-7 w-7 border-white/45';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* esquinas */}
      <span className={`${corner} left-0 top-0 rounded-tl-2xl border-l-2 border-t-2`} />
      <span className={`${corner} right-0 top-0 rounded-tr-2xl border-r-2 border-t-2`} />
      <span className={`${corner} bottom-0 left-0 rounded-bl-2xl border-b-2 border-l-2`} />
      <span className={`${corner} bottom-0 right-0 rounded-br-2xl border-b-2 border-r-2`} />
      {/* línea de escaneo */}
      <span className="nl-scan-sweep absolute inset-x-3 h-0.5 rounded-full bg-[var(--color-accent-lime)] shadow-[0_0_10px_rgba(163,230,53,0.7)]" />
      {/* lente central */}
      <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/40">
        <span className="h-3.5 w-3.5 rounded-full border-2 border-white/50" />
      </span>
    </div>
  );
}
