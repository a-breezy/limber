import { describe, expect, it } from 'vitest';
import { CLIPS } from '../animation/clips';
import { validateClip } from '../animation/clip';
import { BODY_AREAS, BODY_REGIONS } from '../domain/types';
import { lowBack } from './exercises/lowBack';
import { shoulders } from './exercises/shoulders';
import { thighs } from './exercises/thighs';
import { describeDosage, estimateSeconds, EXERCISES, ExerciseSchema, getExercise, PHASES } from '.';

describe('exercise library', () => {
  it('every entry passes the schema', () => {
    for (const raw of [...lowBack, ...thighs, ...shoulders]) {
      const r = ExerciseSchema.safeParse(raw);
      expect(r.success, `${raw.id}: ${r.error?.message}`).toBe(true);
    }
  });

  it('has about 30 exercises with unique ids and names', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(30);
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
    expect(new Set(EXERCISES.map((e) => e.name)).size).toBe(EXERCISES.length);
  });

  it('regression / progression links point at real exercises', () => {
    for (const e of EXERCISES) {
      for (const link of [e.regressionId, e.progressionId]) {
        if (link) expect(getExercise(link), `${e.id} → ${link}`).toBeDefined();
      }
    }
  });

  it('every linked animation exists and passes the animation guardrails', () => {
    const linked = EXERCISES.filter((e) => e.animationId);
    expect(linked.length).toBeGreaterThanOrEqual(3);
    for (const e of linked) {
      const clip = CLIPS[e.animationId!];
      expect(clip, `${e.id} → ${e.animationId}`).toBeDefined();
      expect(validateClip(clip!)).toEqual([]);
      expect(clip!.perSide, `${e.id} per-side mismatch`).toBe(e.dosage.perSide);
    }
  });

  it('covers every MVP pain area with each kind of work', () => {
    for (const area of BODY_AREAS) {
      const forArea = EXERCISES.filter((e) =>
        e.targets.some((t) => t.area === area && t.role === 'primary'),
      );
      expect(forArea.length, `${area} primary exercises`).toBeGreaterThanOrEqual(2);
      expect(
        forArea.some((e) => e.phase === 'stretch'),
        `${area} needs a stretch`,
      ).toBe(true);
    }
    for (const region of Object.values(BODY_REGIONS)) {
      const forRegion = EXERCISES.filter((e) =>
        e.targets.some((t) => (region.areas as readonly string[]).includes(t.area)),
      );
      for (const phase of ['mobilize', 'stretch', 'activate'] as const) {
        expect(
          forRegion.some((e) => e.phase === phase),
          `${region.label} needs a ${phase} exercise`,
        ).toBe(true);
      }
    }
    expect(EXERCISES.some((e) => e.phase === 'breathe')).toBe(true);
    expect(PHASES.every((p) => EXERCISES.some((e) => e.phase === p))).toBe(true);
  });

  it('only needs equipment the user has (mat, blocks, roller, band, wall)', () => {
    // Schema enforces the enum; this documents the intent.
    const used = new Set(EXERCISES.flatMap((e) => [...e.equipment, ...e.optionalEquipment]));
    expect(
      [...used].every((u) => ['mat', 'blocks', 'foamRoller', 'band', 'wall'].includes(u)),
    ).toBe(true);
  });

  it('keeps holds within conservative static-stretch guidance (10–60 s)', () => {
    for (const e of EXERCISES) {
      if (e.dosage.kind === 'hold') {
        expect(e.dosage.seconds).toBeGreaterThanOrEqual(10);
        expect(e.dosage.seconds).toBeLessThanOrEqual(60);
      }
    }
  });

  it('is honest about review status', () => {
    expect(EXERCISES.every((e) => e.review === 'self-reviewed')).toBe(true);
  });
});

describe('dosage helpers', () => {
  it('estimates time including sides, sets and setup', () => {
    const quad = getExercise('standing-quad-stretch')!;
    // 30 s × 2 sides × 2 sets + 2 side switches (5 s) + 1 rest (10 s) + setup (10 s)
    expect(estimateSeconds(quad)).toBe(120 + 10 + 10 + 10);
    expect(describeDosage(quad.dosage)).toBe('30 s hold × 2 each side');
  });

  it('a full library pass is long enough to fill a 25-minute session', () => {
    const total = EXERCISES.reduce((s, e) => s + estimateSeconds(e), 0);
    expect(total).toBeGreaterThan(25 * 60);
  });
});
