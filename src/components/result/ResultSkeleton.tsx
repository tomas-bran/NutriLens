/**
 * <ResultSkeleton> — placeholder con la silueta de <ResultView> mientras el
 * server resuelve el producto (loading.tsx de /analizar/[id] y /catalogo/[id]).
 * Evita el "flash" de la página con solo los labels estáticos y sin datos.
 */
const BLOCK = 'animate-pulse rounded-2xl bg-[var(--color-surface)]';

export function ResultSkeleton() {
  return (
    <div
      className="flex flex-col gap-6 px-4 py-2 md:px-6 md:py-6"
      data-testid="result-skeleton"
      aria-hidden="true"
    >
      {/* header */}
      <div className="flex items-start gap-3">
        <div className={`${BLOCK} h-10 w-10 rounded-[13px]`} />
        <div className="flex flex-col gap-2">
          <div className={`${BLOCK} h-3 w-24`} />
          <div className={`${BLOCK} h-7 w-64 max-w-[70vw]`} />
          <div className={`${BLOCK} h-3 w-40`} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_1.6fr] md:items-start">
        <div className="flex flex-col gap-5">
          <div className={`${BLOCK} h-56`} />
          <div className={`${BLOCK} h-60`} />
          <div className="flex flex-col gap-5 sm:flex-row">
            <div className={`${BLOCK} h-24 flex-1`} />
            <div className={`${BLOCK} h-24 flex-1`} />
          </div>
        </div>
        <div className="flex flex-col gap-5">
          <div className={`${BLOCK} h-16`} />
          <div className={`${BLOCK} h-16`} />
          <div className={`${BLOCK} h-16`} />
          <div className={`${BLOCK} h-28`} />
          <div className={`${BLOCK} h-40`} />
        </div>
      </div>
    </div>
  );
}
