import type { Exercise } from '../content';
import type { MobilityTest } from '../domain/profileOptions';
import {
  AREA_LABELS,
  TARGET_LABELS,
  type BodyArea,
  type TargetArea,
  type UserProfile,
} from '../domain/types';

type Weights = Partial<Record<TargetArea, number>>;

/** Areas that help a sore area when they're stronger or looser (trainer knowledge). */
export const SUPPORTS: Record<BodyArea, Weights> = {
  lowBack: { glutes: 0.8, core: 0.8, hipFlexors: 0.6, hamstrings: 0.5, upperBack: 0.3 },
  quads: { hipFlexors: 0.7 },
  hamstrings: { glutes: 0.5, lowBack: 0.3 },
  hipFlexors: { quads: 0.7, glutes: 0.5 },
  adductors: { glutes: 0.5 },
  outerThigh: { glutes: 0.8 },
  shoulders: { upperBack: 0.9, chest: 0.7 },
};

const SPORT_LOAD: Record<string, Weights> = {
  Running: { hamstrings: 2, quads: 2, outerThigh: 2, hipFlexors: 1 },
  Cycling: { hipFlexors: 2, quads: 2, lowBack: 1 },
  Lifting: { hipFlexors: 1, upperBack: 2, shoulders: 1, adductors: 1 },
  'Team sports': { adductors: 2, hamstrings: 2 },
  Hiking: { quads: 1, hamstrings: 1 },
  Swimming: { shoulders: 2, upperBack: 1 },
  Climbing: { shoulders: 2, upperBack: 1, chest: 1 },
  'Racquet sports': { shoulders: 2, adductors: 1 },
};

const MOBILITY_AREAS: Record<MobilityTest, Weights> = {
  toeTouch: { hamstrings: 3, lowBack: 1 },
  deepSquat: { adductors: 2, hipFlexors: 1, glutes: 1 },
  shoulderReach: { shoulders: 3 },
  overheadReach: { shoulders: 2, upperBack: 2, chest: 1 },
};

const addInto = (into: Weights, w: Weights, k = 1) => {
  for (const [a, v] of Object.entries(w) as [TargetArea, number][]) {
    into[a] = (into[a] ?? 0) + v * k;
  }
};

export interface ScoringContext {
  /** Sore areas we're aiming at today, weighted by how much they bother the person. */
  focus: Partial<Record<BodyArea, number>>;
  support: Weights;
  lifestyle: Weights;
  /** Why lifestyle weights exist, for the "why this exercise" line. */
  lifestyleReason: Partial<Record<TargetArea, string>>;
  recent: ReadonlySet<string>;
}

export function buildContext(
  profile: UserProfile,
  focusAreas: readonly BodyArea[],
  recent: Iterable<string> = [],
): ScoringContext {
  const intensity = new Map(profile.painPoints.map((p) => [p.area, p.intensity]));
  const focus: ScoringContext['focus'] = {};
  for (const a of focusAreas) focus[a] = 1 + (intensity.get(a) ?? 4) / 10;

  const support: Weights = {};
  for (const a of focusAreas) addInto(support, SUPPORTS[a], focus[a] ?? 1);

  const lifestyle: Weights = {};
  const lifestyleReason: ScoringContext['lifestyleReason'] = {};
  const note = (w: Weights, why: string) => {
    addInto(lifestyle, w);
    for (const a of Object.keys(w) as TargetArea[]) lifestyleReason[a] ??= why;
  };

  const { lifestyle: l } = profile;
  if (l.work === 'desk' || l.sittingHours >= 6) {
    note(
      { hipFlexors: 3, upperBack: 3, chest: 2, glutes: 2, hamstrings: 1 },
      'Counters long hours sitting',
    );
  } else if (l.work === 'standing') {
    note({ lowBack: 1, hamstrings: 1 }, 'Eases long hours on your feet');
  }
  for (const s of l.sports)
    if (SPORT_LOAD[s]) note(SPORT_LOAD[s], `Balances your ${s.toLowerCase()}`);
  for (const [test, level] of Object.entries(profile.mobility) as [MobilityTest, string][]) {
    const k = level === 'limited' ? 1 : level === 'average' ? 0.5 : 0;
    if (k) {
      const scaled: Weights = {};
      addInto(scaled, MOBILITY_AREAS[test], k);
      note(scaled, 'Works on a mobility check you found tight');
    }
  }
  for (const a of Object.keys(lifestyle) as TargetArea[]) lifestyle[a] = Math.min(4, lifestyle[a]!);

  return { focus, support, lifestyle, lifestyleReason, recent: new Set(recent) };
}

export interface Scored {
  exercise: Exercise;
  score: number;
  reason: string;
}

/** How well an exercise fits today, plus a one-line "why" for the person. */
export function scoreExercise(ex: Exercise, ctx: ScoringContext, jitter = 0): Scored {
  let focusScore = 0;
  let supportScore = 0;
  let lifeScore = 0;
  let focusArea: BodyArea | undefined;
  let focusPrimary = false;
  let supportArea: TargetArea | undefined;
  let lifeArea: TargetArea | undefined;
  let bestFocus = 0;
  let bestSupport = 0;
  let bestLife = 0;

  for (const t of ex.targets) {
    const primary = t.role === 'primary';
    const f = ctx.focus[t.area as BodyArea] ?? 0;
    const fs = f * (primary ? 10 : 4);
    focusScore += fs;
    if (fs > bestFocus) [bestFocus, focusArea, focusPrimary] = [fs, t.area as BodyArea, primary];

    const ss = (ctx.support[t.area] ?? 0) * (primary ? 3 : 1.5);
    supportScore += ss;
    if (ss > bestSupport) [bestSupport, supportArea] = [ss, t.area];

    const ls = (ctx.lifestyle[t.area] ?? 0) * (primary ? 1 : 0.5);
    lifeScore += ls;
    if (ls > bestLife) [bestLife, lifeArea] = [ls, t.area];
  }

  const recentPenalty = ctx.recent.has(ex.id) ? 6 : 0;
  const score = focusScore + supportScore + lifeScore + jitter - recentPenalty;

  let reason = 'Good all-round mobility';
  if (focusArea && bestFocus >= bestSupport && bestFocus >= bestLife) {
    reason = `${focusPrimary ? 'Targets' : 'Also eases'} your ${AREA_LABELS[focusArea].toLowerCase()}`;
  } else if (supportArea && bestSupport >= bestLife) {
    const helped = (Object.keys(ctx.focus) as BodyArea[]).find(
      (a) => (SUPPORTS[a][supportArea!] ?? 0) > 0,
    );
    reason = helped
      ? `Supports your ${AREA_LABELS[helped].toLowerCase()} through the ${TARGET_LABELS[supportArea].toLowerCase()}`
      : `Works your ${TARGET_LABELS[supportArea].toLowerCase()}`;
  } else if (lifeArea) {
    reason = ctx.lifestyleReason[lifeArea] ?? reason;
  }
  return { exercise: ex, score, reason };
}
