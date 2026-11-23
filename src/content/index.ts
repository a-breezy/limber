import { lowBack } from './exercises/lowBack';
import { shoulders } from './exercises/shoulders';
import { thighs } from './exercises/thighs';
import { ExerciseSchema, type Exercise } from './schema';

export * from './schema';

/** The whole library, validated once at load. Invalid content fails loudly in dev and tests. */
export const EXERCISES: readonly Exercise[] = [...lowBack, ...thighs, ...shoulders].map((e) =>
  ExerciseSchema.parse(e),
);

const byId = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise | undefined {
  return byId.get(id);
}
