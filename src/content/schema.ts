import { z } from 'zod';
import { EQUIPMENT, TARGET_AREAS } from '../domain/types';
import { CONTRAINDICATION_IDS, type Contraindication } from './contraindications';
import { REFERENCE_IDS, type ReferenceId } from './references';

export const PHASES = ['warmup', 'mobilize', 'release', 'stretch', 'activate', 'breathe'] as const;
export const POSITIONS = [
  'standing',
  'seated',
  'kneeling',
  'quadruped',
  'supine',
  'prone',
  'sideLying',
] as const;
export const DISCIPLINES = ['trainer', 'yoga', 'mobility'] as const;

const kebab = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'ids are kebab-case');
const sentence = z.string().min(3).max(220);

const Dosage = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('hold'),
    seconds: z.number().int().min(10).max(120),
    sets: z.number().int().min(1).max(4),
    perSide: z.boolean(),
  }),
  z.object({
    kind: z.literal('reps'),
    reps: z.number().int().min(3).max(30),
    sets: z.number().int().min(1).max(4),
    perSide: z.boolean(),
    /** Seconds per rep, used for time estimates. */
    secondsPerRep: z.number().min(1).max(10),
  }),
  z.object({
    kind: z.literal('timed'),
    seconds: z.number().int().min(20).max(180),
    perSide: z.boolean(),
  }),
]);
export type Dosage = z.infer<typeof Dosage>;

export const ExerciseSchema = z
  .object({
    id: kebab,
    name: z.string().min(3).max(40),
    /** One line, coach voice, shown on cards. */
    summary: sentence,
    targets: z
      .array(z.object({ area: z.enum(TARGET_AREAS), role: z.enum(['primary', 'secondary']) }))
      .min(1),
    phase: z.enum(PHASES),
    discipline: z.enum(DISCIPLINES),
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    position: z.enum(POSITIONS),
    /** Needed to do the exercise at all. */
    equipment: z.array(z.enum(EQUIPMENT)),
    /** Makes it easier or more comfortable if available. */
    optionalEquipment: z.array(z.enum(EQUIPMENT)).default([]),
    dosage: Dosage,
    steps: z.array(sentence).min(2).max(6),
    cues: z.array(sentence).min(1).max(4),
    mistakes: z.array(sentence).min(1).max(4),
    breath: sentence,
    /** Stop / modify if the person reports any of these. */
    contraindications: z.array(
      z.enum(CONTRAINDICATION_IDS as [Contraindication, ...Contraindication[]]),
    ),
    regressionId: kebab.optional(),
    progressionId: kebab.optional(),
    /** Clip id in the animation registry, once it has been animated. */
    animationId: kebab.optional(),
    sources: z.array(z.enum(REFERENCE_IDS as [ReferenceId, ...ReferenceId[]])).min(1),
    review: z.enum(['self-reviewed', 'expert-reviewed']),
  })
  .superRefine((ex, ctx) => {
    if (!ex.targets.some((t) => t.role === 'primary')) {
      ctx.addIssue({
        code: 'custom',
        message: 'needs at least one primary target',
        path: ['targets'],
      });
    }
    if (ex.regressionId === ex.id || ex.progressionId === ex.id) {
      ctx.addIssue({ code: 'custom', message: 'cannot regress/progress to itself' });
    }
    const overlap = ex.optionalEquipment.filter((e) => ex.equipment.includes(e));
    if (overlap.length) {
      ctx.addIssue({ code: 'custom', message: `equipment listed twice: ${overlap.join(', ')}` });
    }
  });

export type ExerciseInput = z.input<typeof ExerciseSchema>;
export type Exercise = z.output<typeof ExerciseSchema>;
export type Phase = (typeof PHASES)[number];
export type Position = (typeof POSITIONS)[number];

/** Seconds to set up / switch between exercises, for time budgeting. */
export const SETUP_SECONDS = 10;
const SWITCH_SIDE_SECONDS = 5;
const REST_BETWEEN_SETS_SECONDS = 10;

/** Estimated wall-clock time for one exercise, including setup and side switches. */
export function estimateSeconds(ex: Exercise): number {
  const d = ex.dosage;
  const sides = d.perSide ? 2 : 1;
  let work: number;
  let sets = 1;
  if (d.kind === 'hold') {
    work = d.seconds;
    sets = d.sets;
  } else if (d.kind === 'reps') {
    work = d.reps * d.secondsPerRep;
    sets = d.sets;
  } else {
    work = d.seconds;
  }
  const total =
    work * sides * sets +
    (sides - 1) * sets * SWITCH_SIDE_SECONDS +
    (sets - 1) * REST_BETWEEN_SETS_SECONDS +
    SETUP_SECONDS;
  return Math.round(total);
}

/** "30 s hold × 2 each side", "10 reps × 2", "45 s each side". */
export function describeDosage(d: Dosage): string {
  const side = d.perSide ? ' each side' : '';
  if (d.kind === 'hold') return `${d.seconds} s hold${d.sets > 1 ? ` × ${d.sets}` : ''}${side}`;
  if (d.kind === 'reps') return `${d.reps} reps${d.sets > 1 ? ` × ${d.sets}` : ''}${side}`;
  return `${d.seconds} s${side}`;
}
