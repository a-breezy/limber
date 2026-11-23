import type { Vec3 } from './math';

/**
 * Body proportions in metres (roughly a 1.78 m adult). Offsets are expressed
 * in the parent segment's local frame; x-offsets are for the LEFT side and are
 * mirrored for the right.
 */
export const BONES = {
  lumbar: 0.2, // pelvis → waist
  thoracic: 0.28, // waist → neck base
  neck: 0.1, // neck base → head base
  headCenter: [0, 0.095, 0.01] as Vec3, // from head base, neck frame
  face: [0, 0.035, 0.06] as Vec3,
  shoulder: [0.175, -0.045, 0] as Vec3, // from neck base, thoracic frame
  upperArm: 0.29,
  forearm: 0.26,
  hand: 0.17,
  hip: [0.09, 0, 0] as Vec3, // from pelvis, pelvis frame
  thigh: 0.44,
  shin: 0.43,
  heel: [0, -0.06, -0.05] as Vec3, // from ankle, foot frame
  ball: [0, -0.065, 0.13] as Vec3,
  toe: [0, -0.06, 0.19] as Vec3,
} as const;
