import {
  dosageSeconds,
  EXERCISES,
  setsOf,
  withSets,
  type Dosage,
  type Exercise,
  type Phase,
  type Position,
} from '../content';
import { AREA_LABELS, type BodyArea, type UserProfile } from '../domain/types';
import { rng } from './random';
import { buildContext, scoreExercise, SUPPORTS, type Scored } from './scoring';

export const BLOCKS = ['warmup', 'stretch', 'activate', 'cooldown'] as const;
export type Block = (typeof BLOCKS)[number];

export const BLOCK_LABELS: Record<Block, string> = {
  warmup: 'Warm up & mobilize',
  stretch: 'Stretch & release',
  activate: 'Activate',
  cooldown: 'Breathe & reset',
};

const BLOCK_OF_PHASE: Record<Phase, Block> = {
  warmup: 'warmup',
  mobilize: 'warmup',
  release: 'stretch',
  stretch: 'stretch',
  activate: 'activate',
  breathe: 'cooldown',
};

export type RoutineKind = 'daily' | 'quickFix' | 'breathing';

/** Share of the session each block gets (gameplan §4). */
const SPLITS: Record<RoutineKind, Partial<Record<Block, number>>> = {
  daily: { warmup: 0.25, stretch: 0.4, activate: 0.25, cooldown: 0.1 },
  quickFix: { warmup: 0.3, stretch: 0.6, cooldown: 0.1 },
  breathing: { cooldown: 1 },
};

/** Minimise getting up and down: standing first, lying down last. */
const POSITION_RANK: Record<Position, number> = {
  standing: 0,
  kneeling: 1,
  quadruped: 2,
  seated: 3,
  prone: 4,
  sideLying: 5,
  supine: 6,
};

export interface RoutineItem {
  exerciseId: string;
  block: Block;
  dosage: Dosage;
  seconds: number;
  reason: string;
}

export interface Routine {
  kind: RoutineKind;
  focus: BodyArea[];
  targetSeconds: number;
  totalSeconds: number;
  items: RoutineItem[];
  /** Plain-language notes about choices made (gentler, skipped gear…). */
  notes: string[];
}

export interface RoutineOptions {
  kind?: RoutineKind;
  /** Areas to focus on; defaults to the profile's pain points. */
  focus?: BodyArea[];
  /** Defaults to the profile's session length (5 for quick fix). */
  minutes?: number;
  /** Exercise ids done recently, to keep things varied. */
  recent?: Iterable<string>;
  seed?: number;
  /** Override the library (tests). */
  library?: readonly Exercise[];
}

/** Score lost for each extra exercise on an area already covered in the same block. */
const REPEAT_PENALTY = 8;

const has = <T>(list: readonly T[], x: T) => list.includes(x);

/** Profile + today's focus → an ordered, timed routine. Pure and deterministic for a seed. */
export function generateRoutine(profile: UserProfile, opts: RoutineOptions = {}): Routine {
  const library = opts.library ?? EXERCISES;
  const kind: RoutineKind = profile.redFlags.length ? 'breathing' : (opts.kind ?? 'daily');
  const focus = [...(opts.focus ?? profile.painPoints.map((p) => p.area))];
  const minutes = opts.minutes ?? (kind === 'quickFix' ? 5 : profile.schedule.minutesPerSession);
  const targetSeconds = kind === 'breathing' ? Math.min(minutes, 5) * 60 : minutes * 60;
  const random = rng(opts.seed ?? 1);
  const notes: string[] = [];

  if (kind === 'breathing') {
    notes.push('You flagged symptoms that need a professional, so today is gentle breathing only.');
  }

  // --- Filters ---------------------------------------------------------------
  const intensity = new Map(profile.painPoints.map((p) => [p.area, p]));
  const gentleAreas = focus.filter((a) => {
    const p = intensity.get(a);
    return p && (p.intensity >= 7 || p.duration === 'acute');
  });
  if (gentleAreas.length) {
    notes.push(
      `Keeping it gentle for your ${gentleAreas.map((a) => AREA_LABELS[a].toLowerCase()).join(' and ')}.`,
    );
  }
  const maxDifficulty = profile.lifestyle.activityLevel >= 4 ? 3 : 2;

  let missingGear = 0;
  let restricted = 0;
  const eligible = library.filter((ex) => {
    if (!ex.equipment.every((e) => has(profile.equipment, e))) {
      missingGear++;
      return false;
    }
    if (ex.contraindications.some((c) => has(profile.conditions, c))) {
      restricted++;
      return false;
    }
    if (ex.difficulty > maxDifficulty) return false;
    const hitsGentle = ex.targets.some(
      (t) => t.role === 'primary' && has(gentleAreas, t.area as BodyArea),
    );
    if (hitsGentle && ex.difficulty > 1) return false;
    // A quick fix stays on the area (and what supports it), plus a breathing finish.
    if (kind === 'quickFix' && ex.phase !== 'breathe') {
      const relevant = new Set<string>(focus);
      for (const a of focus) for (const s of Object.keys(SUPPORTS[a])) relevant.add(s);
      if (!ex.targets.some((t) => relevant.has(t.area))) return false;
    }
    return true;
  });
  if (restricted) notes.push(`Skipped ${restricted} exercises that don’t suit what you told us.`);
  if (missingGear) notes.push(`${missingGear} exercises need gear you don’t have.`);

  // --- Score -------------------------------------------------------------------
  const ctx = buildContext(profile, focus, opts.recent);
  // General mode (nothing hurts): spread a little interest everywhere.
  if (!focus.length) for (const a of Object.keys(AREA_LABELS) as BodyArea[]) ctx.focus[a] = 0.3;
  const scored = new Map<string, Scored>(
    eligible.map((ex) => [ex.id, scoreExercise(ex, ctx, random() * 2)]),
  );
  const byScore = (a: Scored, b: Scored) => b.score - a.score;

  // --- Fill blocks: full dosage where it fits, fewer sets where that's what fits ---
  const chosen = new Map<string, { s: Scored; block: Block; sets: number }>();
  let carry = 0;

  const primaryOf = (ex: Exercise) =>
    ex.targets.filter((t) => t.role === 'primary').map((t) => t.area);
  /** Each extra pick for an area already covered in this block is worth less. */
  const adjusted = (s: Scored, block: Block) => {
    // Only balance when there are several areas to share the time between.
    if (focus.length < 2) return s.score;
    const mine = primaryOf(s.exercise);
    const repeats = [...chosen.values()].filter(
      (c) => c.block === block && primaryOf(c.s.exercise).some((a) => mine.includes(a)),
    ).length;
    return s.score - REPEAT_PENALTY * repeats;
  };
  /** Most sets that fit the budget (full dosage first), or 0 if even one set won't. */
  const fit = (ex: Exercise, budget: number) => {
    for (let sets = setsOf(ex.dosage); sets >= 1; sets--) {
      if (dosageSeconds(withSets(ex.dosage, sets)) <= budget) return sets;
    }
    return 0;
  };

  for (const block of BLOCKS) {
    const share = SPLITS[kind][block];
    if (!share) continue;
    let budget = share * targetSeconds + carry;
    const pool = [...scored.values()]
      .filter((s) => BLOCK_OF_PHASE[s.exercise.phase] === block && !chosen.has(s.exercise.id))
      .sort(byScore);
    const take = (s: Scored, sets: number) => {
      chosen.set(s.exercise.id, { s, block, sets });
      budget -= dosageSeconds(withSets(s.exercise.dosage, sets));
    };

    // Make sure every focus area gets a dedicated stretch.
    if (block === 'stretch') {
      const ordered = [...focus].sort((a, b) => (ctx.focus[b] ?? 0) - (ctx.focus[a] ?? 0));
      for (const area of ordered) {
        for (const s of pool) {
          if (chosen.has(s.exercise.id) || !primaryOf(s.exercise).includes(area)) continue;
          // One set to guarantee coverage; extra sets come back later if time allows.
          if (dosageSeconds(withSets(s.exercise.dosage, 1)) <= budget + 30) {
            take(s, 1);
            break;
          }
        }
      }
    }
    // Every session ends with a breathing reset, even if earlier blocks ran long.
    if (block === 'cooldown' && pool[0]) take(pool[0], 1);

    while (budget > 15) {
      let best: { s: Scored; sets: number; score: number } | undefined;
      for (const s of pool) {
        if (chosen.has(s.exercise.id)) continue;
        const sets = fit(s.exercise, budget + 15);
        const score = adjusted(s, block);
        if (sets && (!best || score > best.score)) best = { s, sets, score };
      }
      if (!best) break;
      take(best.s, best.sets);
    }
    // Overruns are paid back by the next block, so they can't pile up.
    carry = budget;
  }

  const total = () =>
    [...chosen.values()].reduce(
      (t, c) => t + dosageSeconds(withSets(c.s.exercise.dosage, c.sets)),
      0,
    );

  // --- Still too long? Drop the weakest picks, keeping each area's own stretch ---
  const protectedIds = new Set(
    focus.flatMap((area) => {
      const own = [...chosen.values()]
        .filter(
          (c) =>
            c.block === 'stretch' &&
            c.s.exercise.targets.some((t) => t.area === area && t.role === 'primary'),
        )
        .sort((a, b) => byScore(a.s, b.s));
      return own.length ? [own[0]!.s.exercise.id] : [];
    }),
  );
  while (total() > targetSeconds + 30) {
    // Trim a set before dropping a whole exercise.
    const multiSet = [...chosen.values()]
      .filter((c) => c.sets > 1)
      .sort((a, b) => a.s.score - b.s.score)[0];
    if (multiSet) {
      multiSet.sets--;
      continue;
    }
    const weakest = [...chosen.values()]
      .filter((c) => !protectedIds.has(c.s.exercise.id) && c.block !== 'cooldown')
      .sort((a, b) => a.s.score - b.s.score)[0];
    if (!weakest) break;
    chosen.delete(weakest.s.exercise.id);
  }

  // --- Use leftover time: full sets for the best picks, then extra exercises ---
  const ranked = [...chosen.values()].sort((a, b) => byScore(a.s, b.s));
  for (const c of ranked) {
    const full = setsOf(c.s.exercise.dosage);
    while (c.sets < full) {
      const extra =
        dosageSeconds(withSets(c.s.exercise.dosage, c.sets + 1)) -
        dosageSeconds(withSets(c.s.exercise.dosage, c.sets));
      if (total() + extra > targetSeconds + 20) break;
      c.sets++;
    }
  }
  if (kind !== 'breathing') {
    while (total() < targetSeconds - 30) {
      let best: { s: Scored; block: Block; sets: number; score: number } | undefined;
      for (const s of scored.values()) {
        const block = BLOCK_OF_PHASE[s.exercise.phase];
        if (chosen.has(s.exercise.id) || !SPLITS[kind][block]) continue;
        const sets = fit(s.exercise, targetSeconds + 20 - total());
        const score = adjusted(s, block);
        if (sets && (!best || score > best.score)) best = { s, block, sets, score };
      }
      if (!best) break;
      chosen.set(best.s.exercise.id, { s: best.s, block: best.block, sets: best.sets });
    }
  }

  if (total() < targetSeconds * 0.8 && kind !== 'breathing') {
    notes.push('Shorter than planned: there aren’t enough suitable exercises for today’s focus.');
  }

  // --- Order: block, then position (fewer ups and downs), then score ---------
  const items: RoutineItem[] = [...chosen.values()]
    .sort(
      (a, b) =>
        BLOCKS.indexOf(a.block) - BLOCKS.indexOf(b.block) ||
        POSITION_RANK[a.s.exercise.position] - POSITION_RANK[b.s.exercise.position] ||
        b.s.score - a.s.score,
    )
    .map(({ s, block, sets }) => {
      const dosage = withSets(s.exercise.dosage, sets);
      return {
        exerciseId: s.exercise.id,
        block,
        dosage,
        seconds: dosageSeconds(dosage),
        reason: block === 'cooldown' ? 'Wind down and let the work settle in' : s.reason,
      };
    });

  return {
    kind,
    focus,
    targetSeconds,
    totalSeconds: items.reduce((t, i) => t + i.seconds, 0),
    items,
    notes,
  };
}
