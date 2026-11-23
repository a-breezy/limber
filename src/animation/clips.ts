import type { Clip } from './clip';
import { pose } from './pose';

/*
 * Spike clips: one per MVP body area. Angles are authored in anatomical terms
 * (see pose.ts for sign conventions). Comments note the world-space intent.
 */

// Tabletop: torso tipped 78° forward, thighs and arms vertical, shins on the mat.
const quadrupedLegs = (hip: number) => ({
  'hipL.flex': hip, // = pelvis pitch, so thighs stay vertical
  'hipR.flex': hip,
  'kneeL.flex': 90,
  'kneeR.flex': 90,
  'ankleL.dorsi': -70, // tops of the feet on the mat
  'ankleR.dorsi': -70,
});
const quadrupedArms = (shoulder: number) => ({
  'shoulderL.flex': shoulder, // = torso angle, so arms stay vertical
  'shoulderR.flex': shoulder,
  'wristL.bend': 90, // palms flat, fingers forward
  'wristR.bend': 90,
});

export const catCow: Clip = {
  id: 'cat-cow',
  name: 'Cat-Cow',
  camera: 'side',
  ground: 'first',
  perSide: false,
  props: ['mat'],
  pins: { wristL: { kind: 'plant' }, wristR: { kind: 'plant' } },
  keyframes: [
    {
      label: 'Tabletop: wrists under shoulders, knees under hips',
      transition: 1.6,
      hold: 0.6,
      pose: pose({ pitch: 78 }, { ...quadrupedLegs(78), ...quadrupedArms(78) }),
    },
    {
      label: 'Cat: exhale, round your back, tuck your chin',
      transition: 2.2,
      hold: 1.2,
      pose: pose(
        { pitch: 50 }, // tail tucks under
        {
          ...quadrupedLegs(50),
          ...quadrupedArms(95),
          'lumbar.flex': 12,
          'thoracic.flex': 33, // mid-back lifts to the ceiling
          'neck.flex': 40,
        },
      ),
    },
    {
      label: 'Cow: inhale, drop your belly, lift your gaze',
      transition: 2.6,
      hold: 1.2,
      pose: pose(
        { pitch: 112 }, // tail lifts
        {
          ...quadrupedLegs(112),
          ...quadrupedArms(64),
          'lumbar.flex': -17,
          'thoracic.flex': -31, // chest opens forward
          'neck.flex': -22, // gaze forward-up, not at the ceiling
        },
      ),
    },
  ],
};

const relaxedArms = {
  'shoulderL.abd': 6,
  'shoulderR.abd': 6,
  'elbowL.flex': 8,
  'elbowR.flex': 8,
};

const quadLift = pose(
  {},
  {
    ...relaxedArms,
    'kneeR.flex': 60,
    'hipR.flex': 15,
    'ankleR.dorsi': 30,
    'shoulderR.flex': -20,
    'elbowR.flex': 20,
    'shoulderL.flex': 50,
    'elbowL.flex': 10,
  },
);

export const standingQuadStretch: Clip = {
  id: 'standing-quad-stretch',
  name: 'Standing Quad Stretch',
  camera: 'side',
  ground: 'perKeyframe',
  perSide: true,
  pins: { wristR: { kind: 'point', point: 'ankleR', offset: [0, 0.01, 0.04] } },
  keyframes: [
    {
      label: 'Stand tall, weight on your left foot',
      transition: 1.4,
      hold: 1,
      pinWeights: { wristR: 0 },
      pose: pose({}, relaxedArms),
    },
    {
      // Bending the knee tips the toes down; lifting the knee slightly with the
      // foot flexed keeps the toes clear of the floor during the lift.
      label: 'Bend your knee and lift your heel',
      transition: 1.1,
      hold: 0.2,
      pinWeights: { wristR: 0 },
      pose: quadLift,
    },
    {
      label: 'Heel to glute, knees together, hips pressed forward',
      transition: 1.4,
      hold: 3.5,
      pinWeights: { wristR: 1 },
      pose: pose(
        {},
        {
          ...relaxedArms,
          'kneeR.flex': 145,
          'hipR.flex': -8, // knee points at the floor, slightly behind
          'ankleR.dorsi': 0,
          'shoulderR.flex': -35, // reach back for the ankle
          'elbowR.flex': 25,
          'shoulderL.flex': 75, // free arm forward for balance
          'elbowL.flex': 10,
        },
      ),
    },
    {
      label: 'Let go and lower slowly',
      transition: 1.2,
      hold: 0.2,
      pinWeights: { wristR: 0 },
      pose: quadLift,
    },
  ],
};

const armsForward = {
  'shoulderL.flex': 80, // hands just below shoulder height so the band meets the chest
  'shoulderR.flex': 80,
  'elbowL.flex': 5,
  'elbowR.flex': 5,
};

export const bandPullApart: Clip = {
  id: 'band-pull-apart',
  name: 'Band Pull-Apart',
  camera: 'threeQuarter',
  ground: 'perKeyframe',
  perSide: false,
  props: ['band'],
  keyframes: [
    {
      label: 'Arms straight out front, band taut',
      transition: 1.8,
      hold: 0.5,
      pose: pose({}, armsForward),
    },
    {
      label: 'Pull apart and squeeze your shoulder blades',
      transition: 1.3,
      hold: 1,
      pose: pose(
        {},
        { ...armsForward, 'shoulderL.abd': 82, 'shoulderR.abd': 82, 'thoracic.flex': -6 },
      ),
    },
  ],
};

export const SPIKE_CLIPS: Clip[] = [catCow, standingQuadStretch, bandPullApart];

/** Every animated exercise, by clip id (exercises link here via `animationId`). */
export const CLIPS: Readonly<Record<string, Clip>> = Object.fromEntries(
  SPIKE_CLIPS.map((c) => [c.id, c]),
);
