import { add, apply, lerpVec, mulAll, rotX, rotY, rotZ, type Mat3, type Vec3 } from './math';
import { dofValue, type Pose, type Side } from './pose';
import { BONES } from './skeleton';

export const POINT_NAMES = [
  'pelvis',
  'waist',
  'chestMid',
  'neckBase',
  'headBase',
  'headCenter',
  'face',
  'shoulderL',
  'elbowL',
  'wristL',
  'handL',
  'shoulderR',
  'elbowR',
  'wristR',
  'handR',
  'hipL',
  'kneeL',
  'ankleL',
  'heelL',
  'ballL',
  'toeL',
  'hipR',
  'kneeR',
  'ankleR',
  'heelR',
  'ballR',
  'toeR',
] as const;
export type PointName = (typeof POINT_NAMES)[number];
export type Points = Record<PointName, Vec3>;

/** Segment frames needed later (IK pole directions). */
export interface Frames {
  upperArmL: Mat3;
  upperArmR: Mat3;
  thighL: Mat3;
  thighR: Mat3;
}

export interface Solved {
  points: Points;
  frames: Frames;
}

const down = (len: number): Vec3 => [0, -len, 0];
const up = (len: number): Vec3 => [0, len, 0];
const mirrorX = (v: Vec3, side: Side): Vec3 => (side === 'L' ? v : [-v[0], v[1], v[2]]);

/** Joint angles → world positions of every body landmark. Pure, no constraints. */
export function forwardKinematics(p: Pose): Solved {
  const { root } = p;
  const v = (d: Parameters<typeof dofValue>[1]) => dofValue(p, d);

  const pelvisR = mulAll(rotY(root.yaw), rotX(root.pitch), rotZ(root.roll));
  const spineLocal = (seg: 'lumbar' | 'thoracic' | 'neck') =>
    mulAll(rotX(v(`${seg}.flex`)), rotZ(v(`${seg}.side`)), rotY(v(`${seg}.twist`)));

  const lumbarR = mulAll(pelvisR, spineLocal('lumbar'));
  const thoracicR = mulAll(lumbarR, spineLocal('thoracic'));
  const neckR = mulAll(thoracicR, spineLocal('neck'));

  const pelvis: Vec3 = [root.x, root.y, root.z];
  const waist = add(pelvis, apply(lumbarR, up(BONES.lumbar)));
  const neckBase = add(waist, apply(thoracicR, up(BONES.thoracic)));
  const headBase = add(neckBase, apply(neckR, up(BONES.neck)));

  const points: Partial<Points> = {
    pelvis,
    waist,
    chestMid: lerpVec(waist, neckBase, 0.55),
    neckBase,
    headBase,
    headCenter: add(headBase, apply(neckR, BONES.headCenter)),
    face: add(headBase, apply(neckR, BONES.face)),
  };
  const frames: Partial<Frames> = {};

  for (const s of ['L', 'R'] as const) {
    const sign = s === 'L' ? 1 : -1;

    // Arm
    const upperArmR = mulAll(
      thoracicR,
      rotX(-v(`shoulder${s}.flex`)),
      rotZ(sign * v(`shoulder${s}.abd`)),
      rotY(sign * v(`shoulder${s}.twist`)),
    );
    const forearmR = mulAll(upperArmR, rotX(-v(`elbow${s}.flex`)));
    const handR = mulAll(forearmR, rotX(-v(`wrist${s}.bend`)));
    const shoulder = add(neckBase, apply(thoracicR, mirrorX(BONES.shoulder, s)));
    const elbow = add(shoulder, apply(upperArmR, down(BONES.upperArm)));
    const wrist = add(elbow, apply(forearmR, down(BONES.forearm)));
    points[`shoulder${s}`] = shoulder;
    points[`elbow${s}`] = elbow;
    points[`wrist${s}`] = wrist;
    points[`hand${s}`] = add(wrist, apply(handR, down(BONES.hand)));
    frames[`upperArm${s}`] = upperArmR;

    // Leg
    const thighR = mulAll(
      pelvisR,
      rotX(-v(`hip${s}.flex`)),
      rotZ(sign * v(`hip${s}.abd`)),
      rotY(sign * v(`hip${s}.twist`)),
    );
    const shinR = mulAll(thighR, rotX(v(`knee${s}.flex`)));
    const footR = mulAll(shinR, rotX(-v(`ankle${s}.dorsi`)));
    const hip = add(pelvis, apply(pelvisR, mirrorX(BONES.hip, s)));
    const knee = add(hip, apply(thighR, down(BONES.thigh)));
    const ankle = add(knee, apply(shinR, down(BONES.shin)));
    points[`hip${s}`] = hip;
    points[`knee${s}`] = knee;
    points[`ankle${s}`] = ankle;
    points[`heel${s}`] = add(ankle, apply(footR, BONES.heel));
    points[`ball${s}`] = add(ankle, apply(footR, BONES.ball));
    points[`toe${s}`] = add(ankle, apply(footR, BONES.toe));
    frames[`thigh${s}`] = thighR;
  }

  return { points: points as Points, frames: frames as Frames };
}
