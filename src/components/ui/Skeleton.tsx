import type { HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string;
  height?: string;
}

export function Skeleton({ width, height, className = '', style, ...rest }: SkeletonProps) {
  return (
    <div
      {...rest}
      aria-hidden="true"
      role="presentation"
      style={{ width, height, ...style }}
      className={['animate-pulse rounded-md bg-[var(--color-surface)]', className]
        .filter(Boolean)
        .join(' ')}
    />
  );
}
