import type { ReactNode } from 'react';

interface Props {
  index: number;
  total: number;
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  /** Secondary action shown above the main button (e.g. "Skip", "None of these"). */
  secondary?: { label: string; onClick: () => void };
}

/** Frame for each onboarding step: progress, title, content, sticky actions. */
export function StepShell({
  index,
  total,
  eyebrow,
  title,
  subtitle,
  children,
  onBack,
  onNext,
  nextLabel = 'Next',
  nextDisabled,
  secondary,
}: Props) {
  const pct = Math.round(((index + 1) / total) * 100);
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={!onBack}
          aria-label="Back"
          className="grid size-11 shrink-0 place-items-center rounded-full border border-line text-lg font-black disabled:invisible"
        >
          ←
        </button>
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-label="Onboarding progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <header className="mt-6">
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-widest text-brand">{eyebrow}</p>
        )}
        <h1 className="mt-1 font-display text-3xl font-black leading-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
      </header>

      <main className="mt-6 flex-1 space-y-6 pb-44">{children}</main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-line bg-bg/95 backdrop-blur-md">
        <div className="mx-auto max-w-md space-y-2 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {secondary && (
            <button
              type="button"
              onClick={secondary.onClick}
              className="min-h-11 w-full rounded-full font-bold text-muted"
            >
              {secondary.label}
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className="min-h-14 w-full rounded-full bg-brand font-display text-lg font-black text-brand-ink shadow-lg shadow-brand/30 transition-opacity disabled:opacity-40 disabled:shadow-none"
          >
            {nextLabel}
          </button>
        </div>
      </footer>
    </div>
  );
}
