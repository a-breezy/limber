import { describe, expect, it } from 'vitest';
import { CONTRAINDICATION_IDS } from '../content/contraindications';
import { getExercise } from '../content';
import { BODY_AREAS, EQUIPMENT, SESSION_LENGTHS, type UserProfile } from '../domain/types';
import { planWeek, quickFix, routineForDay, sessionDays, sessionFocus } from './plan';
import { rng } from './random';
import { BLOCKS, generateRoutine, type Routine } from './routine';

const me: UserProfile = {
  id: 'me',
  createdAt: '2026-11-23T00:00:00.000Z',
  updatedAt: '2026-11-23T00:00:00.000Z',
  disclaimerAcceptedAt: '2026-11-23T00:00:00.000Z',
  painPoints: [
    { area: 'lowBack', side: 'both', intensity: 6, duration: 'chronic', triggers: ['sitting'] },
    { area: 'quads', side: 'both', intensity: 4, duration: 'chronic', triggers: [] },
    { area: 'hamstrings', side: 'both', intensity: 4, duration: 'chronic', triggers: [] },
    { area: 'shoulders', side: 'both', intensity: 5, duration: 'chronic', triggers: [] },
  ],
  redFlags: [],
  conditions: [],
  lifestyle: { work: 'desk', sittingHours: 8, activityLevel: 3, sports: ['Running'] },
  mobility: { toeTouch: 'limited' },
  schedule: { daysPerWeek: 4, minutesPerSession: 15 },
  equipment: ['mat', 'blocks', 'foamRoller', 'band', 'wall'],
};

const ex = (id: string) => getExercise(id)!;
const blocksInOrder = (r: Routine) =>
  r.items.every(
    (it, i) => i === 0 || BLOCKS.indexOf(r.items[i - 1]!.block) <= BLOCKS.indexOf(it.block),
  );

/** Every safety rule the engine must never break. */
function assertSafe(profile: UserProfile, r: Routine) {
  const ids = r.items.map((i) => i.exerciseId);
  expect(new Set(ids).size, 'no duplicates').toBe(ids.length);
  expect(blocksInOrder(r), 'blocks in order').toBe(true);
  for (const it of r.items) {
    const e = ex(it.exerciseId);
    expect(
      e.equipment.every((g) => profile.equipment.includes(g)),
      `${e.id} gear`,
    ).toBe(true);
    expect(
      e.contraindications.some((c) => profile.conditions.includes(c)),
      `${e.id} contra`,
    ).toBe(false);
    if (profile.redFlags.length) expect(e.phase).toBe('breathe');
  }
  expect(r.totalSeconds).toBe(r.items.reduce((t, i) => t + i.seconds, 0));
}

describe('generateRoutine', () => {
  it('builds a full, ordered session that fits the time', () => {
    for (const minutes of SESSION_LENGTHS) {
      const r = generateRoutine(me, { minutes, seed: 7 });
      assertSafe(me, r);
      expect(r.totalSeconds, `${minutes} min`).toBeGreaterThanOrEqual(minutes * 60 * 0.85);
      expect(r.totalSeconds, `${minutes} min`).toBeLessThanOrEqual(minutes * 60 + 30);
      expect(new Set(r.items.map((i) => i.block))).toEqual(new Set(BLOCKS));
      expect(r.items.at(-1)!.block).toBe('cooldown');
      // Coach-like pacing: at most about one exercise per minute, not a blur of moves.
      expect(r.items.length, `${minutes} min`).toBeLessThanOrEqual(minutes);
    }
  });

  it('spreads stretches across sore areas instead of piling onto one', () => {
    const r = generateRoutine(me, { minutes: 15, seed: 11 });
    const lowBackStretches = r.items.filter(
      (i) =>
        i.block === 'stretch' &&
        ex(i.exerciseId).targets.some((t) => t.area === 'lowBack' && t.role === 'primary'),
    );
    expect(lowBackStretches.length).toBeLessThanOrEqual(2);
  });

  it.each([10, 15, 20, 25])('gives every sore area its own stretch (%i min)', (minutes) => {
    const r = generateRoutine(me, { minutes, seed: 3 });
    for (const area of me.painPoints.map((p) => p.area)) {
      const hit = r.items.some(
        (i) =>
          i.block === 'stretch' &&
          ex(i.exerciseId).targets.some((t) => t.area === area && t.role === 'primary'),
      );
      expect(hit, area).toBe(true);
    }
  });

  it('respects restrictions and missing gear, and says so', () => {
    const p: UserProfile = { ...me, conditions: ['kneePain', 'wristPain'], equipment: [] };
    const r = generateRoutine(p, { seed: 1 });
    assertSafe(p, r);
    expect(r.items.map((i) => i.exerciseId)).not.toContain('cat-cow');
    expect(r.items.map((i) => i.exerciseId)).not.toContain('standing-quad-stretch');
    expect(r.notes.join(' ')).toMatch(/skipped .* exercises/i);
    expect(r.notes.join(' ')).toMatch(/gear/i);
  });

  it('keeps very sore or recent pain gentle', () => {
    const p: UserProfile = {
      ...me,
      lifestyle: { ...me.lifestyle, activityLevel: 5 },
      painPoints: [{ area: 'quads', side: 'left', intensity: 8, duration: 'acute', triggers: [] }],
    };
    const r = generateRoutine(p, { minutes: 25, seed: 2 });
    for (const it of r.items) {
      const e = ex(it.exerciseId);
      if (e.targets.some((t) => t.area === 'quads' && t.role === 'primary')) {
        expect(e.difficulty, e.id).toBe(1);
      }
    }
    expect(r.items.map((i) => i.exerciseId)).not.toContain('couch-stretch');
    expect(r.notes.join(' ')).toMatch(/gentle/i);
  });

  it('red flags → breathing only', () => {
    const p: UserProfile = { ...me, redFlags: ['trauma'] };
    const r = generateRoutine(p);
    expect(r.kind).toBe('breathing');
    expect(r.items.length).toBeGreaterThan(0);
    assertSafe(p, r);
  });

  it('is deterministic for a seed and varies across seeds', () => {
    expect(generateRoutine(me, { seed: 42 })).toEqual(generateRoutine(me, { seed: 42 }));
    const sets = new Set(
      [1, 2, 3, 4, 5, 6].map((seed) =>
        generateRoutine(me, { seed, minutes: 15 })
          .items.map((i) => i.exerciseId)
          .join(),
      ),
    );
    expect(sets.size).toBeGreaterThan(1);
  });

  it('steers away from recently done exercises', () => {
    const first = generateRoutine(me, { seed: 9 }).items.map((i) => i.exerciseId);
    const second = generateRoutine(me, { seed: 9, recent: first }).items.map((i) => i.exerciseId);
    const repeats = second.filter((id) => first.includes(id)).length;
    expect(repeats).toBeLessThan(first.length);
  });

  it('works with no pain points (general mobility)', () => {
    const p: UserProfile = { ...me, painPoints: [] };
    const r = generateRoutine(p, { seed: 4 });
    assertSafe(p, r);
    expect(r.totalSeconds).toBeGreaterThanOrEqual(15 * 60 * 0.85);
  });

  it('never breaks a safety rule across 400 random profiles', () => {
    const rand = rng(2026);
    const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]!;
    const subset = <T>(xs: readonly T[]) => xs.filter(() => rand() < 0.5);
    for (let n = 0; n < 400; n++) {
      const p: UserProfile = {
        ...me,
        painPoints: subset(BODY_AREAS).map((area) => ({
          area,
          side: 'both',
          intensity: Math.floor(rand() * 11),
          duration: rand() < 0.3 ? 'acute' : 'chronic',
          triggers: [],
        })),
        redFlags: rand() < 0.05 ? ['nightPain'] : [],
        conditions: subset(CONTRAINDICATION_IDS),
        lifestyle: {
          work: pick(['desk', 'standing', 'active', 'mixed'] as const),
          sittingHours: Math.floor(rand() * 14),
          activityLevel: pick([1, 2, 3, 4, 5] as const),
          sports: subset(['Running', 'Cycling', 'Climbing']),
        },
        schedule: {
          daysPerWeek: 1 + Math.floor(rand() * 7),
          minutesPerSession: pick(SESSION_LENGTHS),
        },
        equipment: subset(EQUIPMENT),
      };
      const r = generateRoutine(p, { seed: n });
      assertSafe(p, r);
      expect(r.totalSeconds).toBeLessThanOrEqual(r.targetSeconds + 30);
      if (r.kind !== 'breathing') expect(r.items.length).toBeGreaterThan(0);
    }
  });
});

describe('weekly plan', () => {
  it('spreads sessions across the week', () => {
    expect(sessionDays(4)).toEqual([0, 1, 3, 5]);
    expect(sessionDays(3)).toEqual([0, 2, 4]);
    expect(sessionDays(7)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    const week = planWeek(me, new Date(2026, 10, 25)); // a Wednesday
    expect(week[0]!.date).toBe('2026-11-23'); // Monday
    expect(week.filter((d) => d.isSessionDay)).toHaveLength(4);
  });

  it('rotates focus when there are many sore areas, always keeping the sorest', () => {
    expect(sessionFocus(me, 0)[0]).toBe('lowBack');
    expect(sessionFocus(me, 0)).toHaveLength(3);
    expect(sessionFocus(me, 1)[0]).toBe('lowBack');
    expect(new Set([...sessionFocus(me, 0), ...sessionFocus(me, 1)])).toEqual(
      new Set(me.painPoints.map((p) => p.area)),
    );
  });

  it('gives the same routine all day, and a different one next session', () => {
    const mon = new Date(2026, 10, 23, 8);
    expect(routineForDay(me, mon)).toEqual(routineForDay(me, new Date(2026, 10, 23, 20)));
    const tue = routineForDay(me, new Date(2026, 10, 24)).routine.items.map((i) => i.exerciseId);
    const monIds = routineForDay(me, mon).routine.items.map((i) => i.exerciseId);
    expect(tue.join()).not.toBe(monIds.join());
  });
});

describe('quick fix', () => {
  it('is about 5 minutes on the chosen region, no strength block', () => {
    const r = quickFix(me, 'shoulders', new Date(2026, 10, 23));
    expect(r.kind).toBe('quickFix');
    expect(r.focus).toEqual(['shoulders']);
    expect(r.totalSeconds).toBeLessThanOrEqual(5 * 60 + 30);
    expect(r.totalSeconds).toBeGreaterThanOrEqual(5 * 60 * 0.7);
    expect(r.items.some((i) => i.block === 'activate')).toBe(false);
    for (const region of ['lowBack', 'thighs', 'shoulders'] as const) {
      const q = quickFix(me, region, new Date(2026, 10, 23));
      expect(
        q.items.some((i) => i.block === 'warmup'),
        `${region} warm-up`,
      ).toBe(true);
    }
  });

  it('stays on the chosen region (no off-topic lifestyle picks)', () => {
    const r = quickFix(me, 'thighs', new Date(2026, 10, 23));
    for (const it of r.items) {
      if (it.block === 'cooldown') continue;
      const areas = ex(it.exerciseId).targets.map((t) => t.area);
      expect(
        areas.some((a) =>
          [
            'quads',
            'hamstrings',
            'hipFlexors',
            'adductors',
            'outerThigh',
            'glutes',
            'lowBack',
          ].includes(a),
        ),
        it.exerciseId,
      ).toBe(true);
    }
  });

  it('uses only the thigh areas you reported, or all of them if none', () => {
    expect(quickFix(me, 'thighs').focus).toEqual(['quads', 'hamstrings']);
    expect(quickFix({ ...me, painPoints: [] }, 'thighs').focus).toHaveLength(5);
  });
});
