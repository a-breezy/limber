import { describeDosage, getExercise } from '../../content';
import { BLOCK_LABELS, BLOCKS, type Routine } from '../../engine/routine';

export const minutesLabel = (seconds: number) => `${Math.max(1, Math.round(seconds / 60))} min`;

/** The routine, grouped by block, with the "why" for each exercise. */
export function RoutineList({ routine }: { routine: Routine }) {
  return (
    <div className="space-y-5">
      {routine.notes.length > 0 && (
        <ul className="space-y-1 rounded-2xl bg-surface p-4 text-sm text-muted">
          {routine.notes.map((n) => (
            <li key={n}>• {n}</li>
          ))}
        </ul>
      )}
      {BLOCKS.map((block) => {
        const items = routine.items.filter((i) => i.block === block);
        if (!items.length) return null;
        const secs = items.reduce((t, i) => t + i.seconds, 0);
        return (
          <section key={block}>
            <h3 className="mb-2 flex items-baseline justify-between text-xs font-bold uppercase tracking-widest text-muted">
              <span>{BLOCK_LABELS[block]}</span>
              <span>{minutesLabel(secs)}</span>
            </h3>
            <ol className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {items.map((it) => {
                const ex = getExercise(it.exerciseId)!;
                return (
                  <li key={it.exerciseId} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold leading-tight">
                        {ex.name}
                        {ex.animationId && (
                          <span className="ml-2 rounded-full bg-zap px-1.5 py-0.5 align-middle text-[10px] font-black text-zap-ink">
                            ▶ DEMO
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted">{it.reason}</p>
                    </div>
                    <p className="shrink-0 text-right text-xs font-bold">
                      {describeDosage(it.dosage)}
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
