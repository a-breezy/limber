import type { Contraindication } from '../content/contraindications';
import type { BodyArea } from './types';

/** What makes a pain point worse. Some imply exercise restrictions. */
export const TRIGGERS = {
  sitting: { label: 'Sitting a long time' },
  standing: { label: 'Standing a long time' },
  morning: { label: 'Stiff in the morning' },
  afterExercise: { label: 'After exercise' },
  bendingForward: {
    label: 'Bending forward',
    implies: { lowBack: 'flexionSensitiveBack' },
  },
  archingBack: {
    label: 'Arching backward',
    implies: { lowBack: 'extensionSensitiveBack' },
  },
  overhead: { label: 'Reaching overhead' },
  night: { label: 'At night' },
} as const satisfies Record<
  string,
  { label: string; implies?: Partial<Record<BodyArea, Contraindication>> }
>;
export type Trigger = keyof typeof TRIGGERS;

/**
 * Warning signs that something more serious may be going on. Any "yes" means
 * Limber recommends seeing a professional before stretching. Based on the
 * commonly taught red flags for back, hip and shoulder pain.
 */
export const RED_FLAGS = {
  bladderBowel: 'New trouble controlling your bladder or bowels',
  saddleNumbness: 'Numbness around your groin, buttocks or inner thighs',
  legWeakness: 'Leg weakness that is getting worse, or a foot that drags',
  trauma: 'Pain that started after a fall, accident or hard impact',
  feverWeightLoss: 'Fever, or weight loss you can’t explain, along with the pain',
  nightPain: 'Severe pain at night that doesn’t ease with rest or changing position',
  chestPain: 'Chest pain, or pain spreading into your arm or jaw with shortness of breath',
  cancerHistory: 'A history of cancer and new, unexplained pain',
} as const;
export type RedFlag = keyof typeof RED_FLAGS;

export const MOBILITY_TESTS = {
  toeTouch: {
    name: 'Toe touch',
    checks: 'Back of the legs and low back',
    howTo: 'Stand with feet together and knees straight. Slowly reach down toward your toes.',
    levels: {
      limited: 'Fingertips stop above my shins',
      average: 'I reach my shins or ankles',
      good: 'I touch my toes or the floor',
    },
  },
  deepSquat: {
    name: 'Deep squat',
    checks: 'Hips, knees and ankles',
    howTo: 'Feet shoulder-width apart, arms forward. Squat as low as you can with heels down.',
    levels: {
      limited: 'Thighs stay well above parallel, or heels lift',
      average: 'Thighs reach about parallel',
      good: 'Hips drop below my knees, heels down',
    },
  },
  shoulderReach: {
    name: 'Back scratch',
    checks: 'Shoulder rotation',
    howTo:
      'Reach one hand over your shoulder and the other up your back. Try to touch fingertips. Test both sides.',
    levels: {
      limited: 'More than a hand’s width apart',
      average: 'Fingertips are close but don’t touch',
      good: 'Fingertips touch or overlap',
    },
  },
  overheadReach: {
    name: 'Overhead reach',
    checks: 'Shoulder and upper-back mobility',
    howTo:
      'Stand with your back, head and bottom against a wall. Raise straight arms overhead toward the wall without arching.',
    levels: {
      limited: 'Hands stop well in front of the wall',
      average: 'Hands nearly reach the wall',
      good: 'Thumbs touch the wall, back stays flat',
    },
  },
} as const;
export type MobilityTest = keyof typeof MOBILITY_TESTS;

export const WORK_TYPES = {
  desk: 'Mostly sitting (desk, driving)',
  standing: 'Mostly standing',
  active: 'Physical, on the move',
  mixed: 'A mix',
} as const;

export const ACTIVITY_LEVELS = {
  1: 'Barely moving',
  2: 'Light: walks here and there',
  3: 'Moderate: active a few times a week',
  4: 'Active: training most days',
  5: 'Athlete mode',
} as const;

export const SPORTS = [
  'Running',
  'Cycling',
  'Lifting',
  'Yoga',
  'Team sports',
  'Hiking',
  'Swimming',
  'Climbing',
  'Racquet sports',
] as const;

export const TIMES_OF_DAY = {
  morning: 'Morning',
  midday: 'Midday',
  evening: 'Evening',
} as const;
