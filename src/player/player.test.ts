import { describe, expect, it } from 'vitest';
import { getExercise } from '../content';
import type { UserProfile } from '../domain/types';
import { generateRoutine } from '../engine/routine';
import { easierAlternatives } from './alternatives';
import {
  currentRep,
  currentStep,
  initPlayer,
  overallElapsed,
  playerReducer,
  secondsLeft,
  totalSeconds,
  type PlayerAction,
  type PlayerState,
} from './player';
import { buildScript, scriptSeconds } from './script';

const me: UserProfile = {
  id: 'me',
  createdAt: '',
  updatedAt: '',
  disclaimerAcceptedAt: '',
  painPoints: [
    { area: 'lowBack', side: 'both', intensity: 6, duration: 'chronic', triggers: [] },
    { area: 'quads', side: 'both', intensity: 4, duration: 'chronic', triggers: [] },
  ],
  redFlags: [],
  conditions: [],
  lifestyle: { work: 'desk', sittingHours: 8, activityLevel: 3, sports: [] },
  mobility: {},
  schedule: { daysPerWeek: 4, minutesPerSession: 15 },
  equipment: ['mat', 'blocks', 'foamRoller', 'band', 'wall'],
};
const routine = generateRoutine(me, { seed: 5 });
const run = (s: PlayerState, ...actions: PlayerAction[]) => actions.reduce(playerReducer, s);
const started = () => run(initPlayer(routine.items), { type: 'start' });

describe('script', () => {
  it('plays for exactly as long as the plan says', () => {
    expect(scriptSeconds(buildScript(routine.items))).toBe(routine.totalSeconds);
  });

  it('lays out sets, sides, switches and rests', () => {
    const item = {
      ...routine.items[0]!,
      dosage: { kind: 'hold', seconds: 30, sets: 2, perSide: true } as const,
    };
    expect(
      buildScript([item]).map((s) => s.kind + ('side' in s && s.side ? `-${s.side}` : '')),
    ).toEqual([
      'intro',
      'work-right',
      'switch',
      'work-left',
      'rest',
      'work-right',
      'switch',
      'work-left',
    ]);
  });
});

describe('player', () => {
  it('only ticks while playing, and carries time across steps', () => {
    let s = initPlayer(routine.items);
    expect(run(s, { type: 'tick', dt: 5 }).elapsed).toBe(0); // not started
    s = run(s, { type: 'start' }, { type: 'tick', dt: 12 }); // 10 s intro + 2 s into work
    expect(currentStep(s)!.kind).toBe('work');
    expect(s.elapsed).toBeCloseTo(2);
    const paused = run(s, { type: 'pause' }, { type: 'tick', dt: 30 });
    expect(paused.elapsed).toBeCloseTo(2);
    expect(overallElapsed(paused)).toBeCloseTo(12);
  });

  it('counts paced reps', () => {
    const item = {
      ...routine.items[0]!,
      dosage: { kind: 'reps', reps: 8, sets: 1, perSide: false, secondsPerRep: 5 } as const,
    };
    const s = run(
      initPlayer([item]),
      { type: 'start' },
      { type: 'next' },
      { type: 'tick', dt: 11 },
    );
    expect(currentRep(s)).toBe(3);
  });

  it('runs to the end and records completed exercises', () => {
    const s = run(started(), { type: 'tick', dt: totalSeconds(started()) + 1 });
    expect(s.status).toBe('done');
    expect(s.completed).toHaveLength(routine.items.length);
    expect(s.activeSeconds).toBeGreaterThan(0);
  });

  it('"Start now" and "Done" finish the current step early', () => {
    let s = run(started(), { type: 'next' });
    expect(currentStep(s)!.kind).toBe('work');
    s = run(s, { type: 'next' });
    expect(s.completed).toContain(0);
  });

  it('skips an exercise (recorded) and steps back', () => {
    let s = run(started(), { type: 'skipExercise' });
    expect(currentStep(s)!.item).toBe(1);
    expect(s.skipped).toEqual([routine.items[0]!.exerciseId]);
    s = run(s, { type: 'tick', dt: 12 }, { type: 'prevExercise' }); // restart item 1
    expect(currentStep(s)).toMatchObject({ kind: 'intro', item: 1 });
    s = run(s, { type: 'prevExercise' }); // already at intro → previous exercise
    expect(currentStep(s)).toMatchObject({ kind: 'intro', item: 0 });
  });

  it('swaps in an easier exercise and rebuilds the timeline', () => {
    const i = routine.items.findIndex((it) => getExercise(it.exerciseId)!.phase === 'stretch');
    let s = started();
    while (currentStep(s)!.item < i) s = run(s, { type: 'skipExercise' });
    const before = routine.items[i]!.exerciseId;
    const alt = easierAlternatives(
      before,
      me,
      routine.items.map((x) => x.exerciseId),
    )[0]!;
    s = run(s, { type: 'next' }, { type: 'swap', exerciseId: alt.id });
    expect(s.items[i]!.exerciseId).toBe(alt.id);
    expect(currentStep(s)).toMatchObject({ kind: 'intro', item: i });
    expect(s.swaps).toEqual([{ from: before, to: alt.id }]);
    expect(totalSeconds(s)).toBe(scriptSeconds(buildScript(s.items)));
    expect(secondsLeft(s)).toBe(10);
  });

  it('can be ended early', () => {
    expect(run(started(), { type: 'end' }).status).toBe('done');
  });
});

describe('easier alternatives', () => {
  it('prefers the authored regression', () => {
    expect(easierAlternatives('couch-stretch', me)[0]!.id).toBe('half-kneeling-hip-flexor');
  });

  it('never suggests something the profile rules out, or harder', () => {
    const p: UserProfile = { ...me, conditions: ['kneePain'], equipment: [] };
    for (const id of ['standing-quad-stretch', 'bird-dog', 'band-pull-apart', 'childs-pose']) {
      const cur = getExercise(id)!;
      for (const alt of easierAlternatives(id, p)) {
        expect(
          alt.equipment.every((e) => p.equipment.includes(e)),
          alt.id,
        ).toBe(true);
        expect(alt.contraindications).not.toContain('kneePain');
        expect(alt.difficulty).toBeLessThanOrEqual(cur.difficulty);
      }
    }
  });
});
