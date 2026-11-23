import { EXERCISES, getExercise, type Exercise } from '../content';
import type { UserProfile } from '../domain/types';

const PHASE_GROUP: Record<Exercise['phase'], string> = {
  warmup: 'move',
  mobilize: 'move',
  stretch: 'stretch',
  release: 'stretch',
  activate: 'activate',
  breathe: 'breathe',
};

export function suitsProfile(ex: Exercise, profile: UserProfile) {
  return (
    ex.equipment.every((e) => profile.equipment.includes(e)) &&
    !ex.contraindications.some((c) => profile.conditions.includes(c))
  );
}

/**
 * Up to three easier options for "too hard / this hurts": the authored
 * regression first, then same-purpose moves for the same area at equal or
 * lower difficulty. Never suggests something the profile rules out.
 */
export function easierAlternatives(
  exerciseId: string,
  profile: UserProfile,
  exclude: Iterable<string> = [],
): Exercise[] {
  const current = getExercise(exerciseId);
  if (!current) return [];
  const skip = new Set([exerciseId, ...exclude]);
  const primary = current.targets.filter((t) => t.role === 'primary').map((t) => t.area);
  const out: Exercise[] = [];

  const regression = current.regressionId ? getExercise(current.regressionId) : undefined;
  if (regression && !skip.has(regression.id) && suitsProfile(regression, profile)) {
    out.push(regression);
  }

  const similar = EXERCISES.filter(
    (ex) =>
      !skip.has(ex.id) &&
      !out.includes(ex) &&
      suitsProfile(ex, profile) &&
      ex.difficulty <= current.difficulty &&
      PHASE_GROUP[ex.phase] === PHASE_GROUP[current.phase] &&
      ex.targets.some((t) => t.role === 'primary' && primary.includes(t.area)),
  ).sort((a, b) => a.difficulty - b.difficulty || a.name.localeCompare(b.name));

  return [...out, ...similar].slice(0, 3);
}
