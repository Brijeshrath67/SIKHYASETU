import type { ReactNode } from 'react';

type PillVariant = 'ok' | 'offline' | 'warn' | 'queue' | 'bag' | 'default';

export function Pill({
  variant = 'default',
  children,
  className = '',
}: {
  variant?: PillVariant;
  children: ReactNode;
  className?: string;
}) {
  const variantClass = variant !== 'default' ? `pill--${variant}` : '';
  return <span className={`pill ${variantClass} ${className}`}>{children}</span>;
}

export function StatusDot({
  online,
  className = '',
}: {
  online: boolean;
  className?: string;
}) {
  return (
    <span
      className={`status-dot ${online ? 'status-dot--online' : 'status-dot--offline'} ${className}`}
      aria-hidden="true"
    />
  );
}

export function VerdictBadge({
  correct,
  className = '',
}: {
  correct: boolean;
  className?: string;
}) {
  return (
    <span className={`verdict ${correct ? 'verdict--ok' : 'verdict--bad'} ${className}`}>
      {correct ? '✓ Correct Understanding' : '⚠ Misconception Identified'}
    </span>
  );
}
