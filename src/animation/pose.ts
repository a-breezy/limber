import { clamp, lerp } from './math';

export type Side = 'L' | 'R';
export const SIDES: readonly Side[] = ['L', 'R'];

/**
 * Joint ranges in degrees. Sign conventions:
 * - flex: + = forward bend (spine, shoulder, hip, elbow), knee + = heel toward glute
 * - side (spine): + = bend to the figure's right
 * - twist (spine): + = rotate toward the figure's left
 * - abd: + = limb moves away from the midline
 * - ankle dorsi: + = toes up, − = point the foot
 * - wrist bend: + = fingers swing forward (palm-flat-on-floor in tabletop ≈ 90)
 */
export const SPINE_LIMITS = {
  'lumbar.flex': [-30, 60],
  'lumbar.side': [-25, 25],
  'lumbar.twist': [-15, 15],
  'thoracic.flex': [-35, 45],
  'thoracic.side': [-20, 20],
  'thoracic.twist': [-35, 35],
  'neck.flex': [-50, 60],
  'neck.side': [-40, 40],
  'neck.twist': [-70, 70],
} as const satisfies Record<string, readonly [number, number]>;

export const LIMB_LIMITS = {
  shoulder: { flex: [-60, 180], abd: [-30, 180], twist: [-90, 90] },
  elbow: { flex: [0, 150] },
  wrist: { bend: [-80, 90] },
  hip: { flex: [-30, 140], abd: [-30, 60], twist: [-45, 45] },
  knee: { flex: [0, 155] },
  ankle: { dorsi: [-75, 30] },
} as const;

type LimbJoint = keyof typeof LIMB_LIMITS;
export type LimbDof = {
  [J in LimbJoint]: `${J}${Side}.${Extract<keyof (typeof LIMB_LIMITS)[J], string>}`;
}[LimbJoint];
export type Dof = keyof typeof SPINE_LIMITS | LimbDof;

export const DOF_LIMITS: Record<Dof, readonly [number, number]> = (() => {
  const out: Record<string, readonly [number, number]> = { ...SPINE_LIMITS };
  for (const [joint, dofs] of Object.entries(LIMB_LIMITS)) {
    for (const side of SIDES) {
      for (const [dof, range] of Object.entries(dofs)) out[`${joint}${side}.${dof}`] = range;
    }
  }
  return out as Record<Dof, readonly [number, number]>;
})();

export const DOFS = Object.keys(DOF_LIMITS) as Dof[];

/** Pelvis placement. Position in metres, orientation in degrees. */
export interface Root {
  x: number;
  y: number;
  z: number;
  /** + = lean forward (torso tips toward facing direction). */
  pitch: number;
  /** + = turn toward the figure's left. */
  yaw: number;
  /** + = tip toward the figure's right. */
  roll: number;
}

export interface Pose {
  root: Root;
  joints: Partial<Record<Dof, number>>;
}

export const NEUTRAL_ROOT: Root = { x: 0, y: 1, z: 0, pitch: 0, yaw: 0, roll: 0 };

export const dofValue = (p: Pose, d: Dof) => p.joints[d] ?? 0;

export interface LimitViolation {
  dof: Dof;
  value: number;
  min: number;
  max: number;
}

export function limitViolations(p: Pose, tolerance = 0): LimitViolation[] {
  const out: LimitViolation[] = [];
  for (const [dof, value] of Object.entries(p.joints) as [Dof, number][]) {
    const [min, max] = DOF_LIMITS[dof];
    if (value < min - tolerance || value > max + tolerance) out.push({ dof, value, min, max });
  }
  return out;
}

/** Guardrail: force every joint into its anatomical range. */
export function clampPose(p: Pose): Pose {
  const joints: Pose['joints'] = {};
  for (const [dof, value] of Object.entries(p.joints) as [Dof, number][]) {
    const [min, max] = DOF_LIMITS[dof];
    joints[dof] = clamp(value, min, max);
  }
  return { root: p.root, joints };
}

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const joints: Pose['joints'] = {};
  const keys = new Set([...Object.keys(a.joints), ...Object.keys(b.joints)] as Dof[]);
  for (const k of keys) joints[k] = lerp(dofValue(a, k), dofValue(b, k), t);
  const root = Object.fromEntries(
    (Object.keys(a.root) as (keyof Root)[]).map((k) => [k, lerp(a.root[k], b.root[k], t)]),
  ) as unknown as Root;
  return { root, joints };
}

export const swapSide = <T extends string>(name: T): T =>
  name.replace(/(L|R)(?=\.|$)/, (s) => (s === 'L' ? 'R' : 'L')) as T;

/** Same movement on the other side of the body. */
export function mirrorPose(p: Pose): Pose {
  const joints: Pose['joints'] = {};
  for (const [dof, value] of Object.entries(p.joints) as [Dof, number][]) {
    const isSpine = dof in SPINE_LIMITS;
    if (isSpine) {
      joints[dof] = dof.endsWith('.side') || dof.endsWith('.twist') ? -value : value;
    } else {
      joints[swapSide(dof)] = value;
    }
  }
  return {
    root: { ...p.root, x: -p.root.x, yaw: -p.root.yaw, roll: -p.root.roll },
    joints,
  };
}

/** Helper for authoring: start from neutral and override. */
export const pose = (root: Partial<Root>, joints: Pose['joints'] = {}): Pose => ({
  root: { ...NEUTRAL_ROOT, ...root },
  joints,
});
