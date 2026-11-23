import { SETUP_SECONDS, setsOf, type Dosage } from '../content';
import type { RoutineItem } from '../engine/routine';

/** Matches the time estimates in content/schema.ts so plans and playback agree. */
export const SWITCH_SECONDS = 5;
export const REST_SECONDS = 10;

export type Side = 'right' | 'left';

export type Step =
  | { kind: 'intro'; item: number; seconds: number }
  | {
      kind: 'work';
      item: number;
      set: number;
      sets: number;
      side?: Side;
      /** hold/timed count down; reps are paced (one every secondsPerRep). */
      mode: 'hold' | 'timed' | 'reps';
      seconds: number;
      reps?: number;
      secondsPerRep?: number;
    }
  | { kind: 'switch'; item: number; seconds: number; to: Side }
  | { kind: 'rest'; item: number; seconds: number; nextSet: number };

function workSeconds(d: Dosage) {
  return d.kind === 'reps' ? d.reps * d.secondsPerRep : d.seconds;
}

/** Steps for one exercise: get ready, then each set (and side), with switches and rests. */
export function itemSteps(item: RoutineItem, index: number): Step[] {
  const d = item.dosage;
  const sets = setsOf(d);
  const sides: (Side | undefined)[] = d.perSide ? ['right', 'left'] : [undefined];
  const steps: Step[] = [{ kind: 'intro', item: index, seconds: SETUP_SECONDS }];

  for (let set = 1; set <= sets; set++) {
    sides.forEach((side, i) => {
      if (i > 0) steps.push({ kind: 'switch', item: index, seconds: SWITCH_SECONDS, to: side! });
      steps.push({
        kind: 'work',
        item: index,
        set,
        sets,
        side,
        mode: d.kind,
        seconds: workSeconds(d),
        ...(d.kind === 'reps' ? { reps: d.reps, secondsPerRep: d.secondsPerRep } : {}),
      });
    });
    if (set < sets)
      steps.push({ kind: 'rest', item: index, seconds: REST_SECONDS, nextSet: set + 1 });
  }
  return steps;
}

export function buildScript(items: readonly RoutineItem[]): Step[] {
  return items.flatMap((it, i) => itemSteps(it, i));
}

export const scriptSeconds = (script: readonly Step[]) => script.reduce((t, s) => t + s.seconds, 0);
