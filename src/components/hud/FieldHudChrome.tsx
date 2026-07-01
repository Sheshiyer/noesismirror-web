import type { HTMLAttributes, ReactNode } from 'react';
import { noesisSurfaceClass } from './fieldHudChromeStyles';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-noesis-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-noesis-void';

export interface FieldSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  role?: HTMLAttributes<HTMLDivElement>['role'];
  ariaLabel?: string;
}

export interface HudIconButtonProps {
  label: string;
  title?: string;
  pressed?: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick: () => void;
  className?: string;
}

export interface HudStatusDotProps {
  label: string;
  tone: 'gold' | 'emerald' | 'silver' | 'red';
  pulse?: boolean;
}

export interface ObservedProgressProps {
  observed: number;
  total: number;
  healthLabel: string;
  healthTone: HudStatusDotProps['tone'];
}

// eslint-disable-next-line react-refresh/only-export-components -- stable public API for shared HUD styling helper
export { noesisSurfaceClass } from './fieldHudChromeStyles';

export function CornerBrackets() {
  return (
    <>
      <span aria-hidden className="pointer-events-none absolute -top-px -left-px h-3 w-3 border-t border-l border-noesis-gold" />
      <span aria-hidden className="pointer-events-none absolute -top-px -right-px h-3 w-3 border-t border-r border-noesis-gold" />
      <span aria-hidden className="pointer-events-none absolute -bottom-px -left-px h-3 w-3 border-b border-l border-noesis-gold" />
      <span aria-hidden className="pointer-events-none absolute -bottom-px -right-px h-3 w-3 border-b border-r border-noesis-gold" />
    </>
  );
}

export function FieldSurface({
  children,
  className = '',
  role,
  ariaLabel,
  ...surfaceProps
}: FieldSurfaceProps) {
  return (
    <div
      {...surfaceProps}
      role={role}
      aria-label={ariaLabel}
      className={noesisSurfaceClass(className)}
    >
      <CornerBrackets />
      {children}
    </div>
  );
}

export function HudIconButton({
  label,
  title,
  pressed,
  disabled,
  children,
  onClick,
  className = '',
}: HudIconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-10 w-10 place-items-center border border-noesis-gold/35 bg-noesis-void/70 text-noesis-parchment transition-colors hover:border-noesis-emerald hover:text-noesis-emerald disabled:opacity-40 ${focus} ${className}`}
    >
      {children}
    </button>
  );
}

export function HudKeyChip({ children }: { children: ReactNode }) {
  return (
    <span className="min-w-12 border border-noesis-gold/45 bg-noesis-void/80 px-3 py-1 text-center font-mono text-[10px] uppercase tracking-[0.24em] text-noesis-gold shadow-[0_0_18px_rgba(7,11,29,0.5)]">
      {children}
    </span>
  );
}

const dotTone = {
  gold: 'bg-noesis-gold',
  emerald: 'bg-noesis-emerald',
  silver: 'bg-noesis-parchment/40',
  red: 'bg-red-500',
};

export function HudStatusDot({ label, tone, pulse = false }: HudStatusDotProps) {
  return (
    <span
      aria-label={label}
      title={label}
      className={`inline-block h-2 w-2 rounded-full ${dotTone[tone]} ${pulse ? 'motion-safe:animate-pulse' : ''}`}
    />
  );
}

export function ObservedProgress({
  observed,
  total,
  healthLabel,
  healthTone,
}: ObservedProgressProps) {
  const clamped = total > 0 ? Math.min(1, Math.max(0, observed / total)) : 0;
  const pct = Math.round(clamped * 100);
  return (
    <FieldSurface className="flex items-center gap-3 px-4 py-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-noesis-parchment/80">
        {observed} of {total} mirrors observed
      </span>
      <span className="relative grid h-7 w-7 place-items-center" aria-label={`${pct}% observed`}>
        <span className="absolute inset-0 rounded-full border border-noesis-gold/25" />
        <span
          aria-hidden
          className="absolute inset-0 rounded-full border border-noesis-emerald"
          style={{ clipPath: `inset(${100 - pct}% 0 0 0)` }}
        />
        <HudStatusDot label={healthLabel} tone={healthTone} pulse={healthTone === 'emerald'} />
      </span>
    </FieldSurface>
  );
}
