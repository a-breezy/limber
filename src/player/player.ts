import { dosageSeconds, getExercise, setsOf, withSets } from '../content';
import type { RoutineItem } from '../engine/routine';
import { buildScript, itemSteps, scriptSeconds, type Step } from './script';

export type PlayerStatus = 'ready' | 'playing' | 'paused' | 'done';

export interface PlayerState {
  items: RoutineItem[];
  script: Step[];
  index: number;
  /** Seconds into the current step. */
  elapsed: number;
  status: PlayerStatus;
  /** Items where at least one work step finished. */
  completed: number[];
  skipped: string[];
  swaps: { from: string; to: string }[];
  /** Total seconds actually spent (excludes paused time). */
  activeSeconds: number;
}

export type PlayerAction =
  | { type: 'start' }
  | { type: 'tick'; dt: number }
  | { type: 'pause' }
  | { type: 'resume' }
  /** Finish the current step now ("Start now", "Done", skip the rest). */
  | { type: 'next' }
  | { type: 'skipExercise' }
  | { type: 'prevExercise' }
  | { type: 'swap'; exerciseId: string }
  | { type: 'end' };

export function initPlayer(items: readonly RoutineItem[]): PlayerState {
  return {
    items: [...items],
    script: buildScript(items),
    index: 0,
    elapsed: 0,
    status: 'ready',
    completed: [],
    skipped: [],
    swaps: [],
    activeSeconds: 0,
  };
}

export const currentStep = (s: PlayerState): Step | undefined => s.script[s.index];
export const secondsLeft = (s: PlayerState) =>
  Math.max(0, (currentStep(s)?.seconds ?? 0) - s.elapsed);
export const totalSeconds = (s: PlayerState) => scriptSeconds(s.script);
export const overallElapsed = (s: PlayerState) =>
  scriptSeconds(s.script.slice(0, s.index)) + s.elapsed;
/** Current rep (1-based) during paced reps. */
export function currentRep(s: PlayerState): number | undefined {
  const step = currentStep(s);
  if (step?.kind !== 'work' || step.mode !== 'reps') return undefined;
  return Math.min(step.reps!, Math.floor(s.elapsed / step.secondsPerRep!) + 1);
}

const firstStepOf = (script: Step[], item: number) => script.findIndex((st) => st.item === item);

/** Leave the current step (marking work done) and move to `index`. */
function moveTo(s: PlayerState, index: number): PlayerState {
  const step = currentStep(s);
  const completed =
    step?.kind === 'work' && !s.completed.includes(step.item)
      ? [...s.completed, step.item]
      : s.completed;
  if (index >= s.script.length) {
    return { ...s, completed, index: s.script.length, elapsed: 0, status: 'done' };
  }
  return { ...s, completed, index, elapsed: 0 };
}

function jumpToItem(s: PlayerState, item: number): PlayerState {
  const i = firstStepOf(s.script, item);
  return {
    ...s,
    index: i === -1 ? s.script.length : i,
    elapsed: 0,
    status: i === -1 ? 'done' : s.status,
  };
}

export function playerReducer(s: PlayerState, a: PlayerAction): PlayerState {
  if (s.status === 'done' && a.type !== 'end') return s;
  switch (a.type) {
    case 'start':
      return s.status === 'ready' ? { ...s, status: 'playing' } : s;
    case 'pause':
      return s.status === 'playing' ? { ...s, status: 'paused' } : s;
    case 'resume':
      return s.status === 'paused' ? { ...s, status: 'playing' } : s;
    case 'tick': {
      if (s.status !== 'playing' || a.dt <= 0) return s;
      let next: PlayerState = { ...s, activeSeconds: s.activeSeconds + a.dt };
      let left = a.dt;
      // Carry leftover time across step boundaries so the clock never drifts.
      while (next.status === 'playing' && left > 0) {
        const step = currentStep(next)!;
        const remaining = step.seconds - next.elapsed;
        if (left < remaining) {
          next = { ...next, elapsed: next.elapsed + left };
          left = 0;
        } else {
          left -= remaining;
          next = moveTo(next, next.index + 1);
        }
      }
      return next;
    }
    case 'next':
      return moveTo(s, s.index + 1);
    case 'skipExercise': {
      const item = currentStep(s)!.item;
      const id = s.items[item]!.exerciseId;
      const skipped =
        s.completed.includes(item) || s.skipped.includes(id) ? s.skipped : [...s.skipped, id];
      return jumpToItem({ ...s, skipped }, item + 1);
    }
    case 'prevExercise': {
      const item = currentStep(s)!.item;
      const atIntro = s.index === firstStepOf(s.script, item);
      return jumpToItem(s, atIntro && item > 0 ? item - 1 : item);
    }
    case 'swap': {
      const item = currentStep(s)!.item;
      const old = s.items[item]!;
      const ex = getExercise(a.exerciseId);
      if (!ex) return s;
      const dosage = withSets(ex.dosage, Math.min(setsOf(old.dosage), setsOf(ex.dosage)));
      const replacement: RoutineItem = {
        exerciseId: ex.id,
        block: old.block,
        dosage,
        seconds: dosageSeconds(dosage),
        reason: `Easier option for ${getExercise(old.exerciseId)?.name ?? 'the last move'}`,
      };
      const items = s.items.map((it, i) => (i === item ? replacement : it));
      const start = firstStepOf(s.script, item);
      const end = start + s.script.filter((st) => st.item === item).length;
      const script = [
        ...s.script.slice(0, start),
        ...itemSteps(replacement, item),
        ...s.script.slice(end),
      ];
      return {
        ...s,
        items,
        script,
        index: start,
        elapsed: 0,
        completed: s.completed.filter((c) => c !== item),
        swaps: [...s.swaps, { from: old.exerciseId, to: ex.id }],
      };
    }
    case 'end':
      return { ...s, status: 'done' };
  }
}
