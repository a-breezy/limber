import type { ExerciseInput } from '../schema';

/** Authoring helper: every exercise is self-reviewed until an expert signs off. */
export const define = (e: Omit<ExerciseInput, 'review'>): ExerciseInput => ({
  ...e,
  review: 'self-reviewed',
});
