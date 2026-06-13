/**
 * <LoginDecor> (redesign) — decoración del panel de marca del login:
 * estrellitas lima que titilan (en posiciones pseudo-aleatorias por todo el
 * verde) + un "scan-frame" con un código QR escaneándose. Puramente decorativo
 * (aria-hidden), CSS-animado (sin JS). El scatter es sembrado (mulberry32) para
 * que sea estable entre renders — server component sin hidration mismatch.
 * Las animaciones se neutralizan con prefers-reduced-motion (ver globals.css).
 */
import { Icon } from '@/components/ui/Icon';

/** PRNG sembrado: scatter "random" pero estable entre renders. */
function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SPARKLES = (() => {
  const rand = mulberry32(0x10f1);
  return Array.from({ length: 14 }, () => ({
    top: `${Math.round(rand() * 100)}%`,
    left: `${Math.round(rand() * 100)}%`,
    size: Math.round(8 + rand() * 10),
    delay: `${(rand() * 3).toFixed(2)}s`,
    duration: `${(2.6 + rand() * 1.8).toFixed(2)}s`,
  }));
})();

export function LoginDecor() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {SPARKLES.map((s, i) => (
        <span
          key={i}
          className="nl-twinkle absolute"
          style={{
            top: s.top,
            left: s.left,
            animationDelay: s.delay,
            animationDuration: s.duration,
          }}
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
      {/* línea de escaneo — sutil (baja opacidad), se mueve todo el tiempo */}
      <span className="nl-scan-sweep bg-[var(--color-accent-lime)]/35 absolute inset-x-3 h-0.5 rounded-full shadow-[0_0_8px_rgba(163,230,53,0.3)]" />
      {/* código QR escaneándose en el centro */}
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/85">
        <Icon name="scan-qr-code" className="h-12 w-12" strokeWidth={1.75} />
      </span>
    </div>
  );
}
