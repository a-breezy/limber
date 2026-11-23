import { CLIPS } from '../../animation/clips';
import { Mannequin } from '../../animation/Mannequin';
import type { Exercise } from '../../content';
import type { Side } from '../../player/script';

export const fmt = (s: number) => {
  const t = Math.ceil(s);
  return t >= 60 ? `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` : String(t);
};

/** Animation if we have one, otherwise the steps in big type. */
export function ExerciseVisual({
  exercise,
  side,
  playing,
}: {
  exercise: Exercise;
  side?: Side;
  playing: boolean;
}) {
  const clip = exercise.animationId ? CLIPS[exercise.animationId] : undefined;
  if (clip) {
    return (
      <Mannequin
        clip={clip}
        mirrored={side === 'left'}
        playing={playing}
        className="mx-auto aspect-square max-h-[38vh] w-full"
      />
    );
  }
  return (
    <ol className="mx-auto max-h-[38vh] list-decimal space-y-2 overflow-auto rounded-2xl bg-surface p-5 pl-10 text-sm">
      {exercise.steps.map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ol>
  );
}

/** 4 s in, 6 s out, driven by the step clock so it pauses with the session. */
export function BreathingGuide({ elapsed }: { elapsed: number }) {
  const t = elapsed % 10;
  const inhale = t < 4;
  const k = inhale ? t / 4 : 1 - (t - 4) / 6;
  const scale = 0.55 + 0.45 * (0.5 - Math.cos(Math.PI * k) / 2);
  return (
    <div className="flex flex-col items-center gap-3" aria-live="polite">
      <div className="grid size-48 place-items-center">
        <div
          className="size-48 rounded-full bg-brand/25 ring-4 ring-brand"
          style={{ transform: `scale(${scale})` }}
        />
      </div>
      <p className="font-display text-2xl font-black">{inhale ? 'Breathe in' : 'Breathe out'}</p>
    </div>
  );
}

export function IconButton({
  label,
  onClick,
  children,
  big,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  big?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`grid place-items-center rounded-full font-black ${
        big
          ? 'size-20 bg-brand text-3xl text-brand-ink shadow-lg shadow-brand/30'
          : 'size-14 border border-line bg-surface text-xl'
      }`}
    >
      {children}
    </button>
  );
}
