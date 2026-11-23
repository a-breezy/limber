import type { ReactNode } from 'react';

/** Toggle chip (multi-select) or single-choice chip. */
export function Chip({
  selected,
  onClick,
  children,
  role = 'checkbox',
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  role?: 'checkbox' | 'radio';
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onClick}
      className={`min-h-11 rounded-full px-4 text-sm font-bold transition-colors ${
        selected ? 'bg-brand text-brand-ink' : 'border border-line bg-surface text-ink'
      }`}
    >
      {children}
    </button>
  );
}

/** Large tappable option card (single or multi). */
export function OptionCard({
  selected,
  onClick,
  title,
  description,
  role = 'radio',
}: {
  selected: boolean;
  onClick: () => void;
  title: ReactNode;
  description?: ReactNode;
  role?: 'checkbox' | 'radio';
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onClick}
      className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-colors ${
        selected ? 'border-brand bg-brand/10' : 'border-line bg-surface'
      }`}
    >
      <span
        aria-hidden
        className={`grid size-6 shrink-0 place-items-center rounded-full border-2 text-xs font-black ${
          selected ? 'border-brand bg-brand text-brand-ink' : 'border-line'
        }`}
      >
        {selected ? '✓' : ''}
      </span>
      <span>
        <span className="block font-bold">{title}</span>
        {description && <span className="block text-sm text-muted">{description}</span>}
      </span>
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="font-bold">{label}</legend>
      {hint && <p className="-mt-2 text-sm text-muted">{hint}</p>}
      {children}
    </fieldset>
  );
}

export function RangeField({
  label,
  value,
  min,
  max,
  onChange,
  format = String,
  ends,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  ends?: [string, string];
}) {
  return (
    <label className="block space-y-2">
      <span className="flex items-baseline justify-between">
        <span className="font-bold">{label}</span>
        <span className="font-display text-2xl font-black text-brand">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand"
      />
      {ends && (
        <span className="flex justify-between text-xs text-muted">
          <span>{ends[0]}</span>
          <span>{ends[1]}</span>
        </span>
      )}
    </label>
  );
}
