import { lerpVec, type Vec3 } from './math';
import type { PointName, Points } from './fk';
import type { Side } from './pose';

/**
 * The mannequin's volume: each body part is the convex hull of a few spheres
 * placed on the skeleton. Because spheres hang off joint positions, parts can
 * never detach or change length — the skeleton guarantees it.
 */
type Ref = PointName | readonly [PointName, PointName, number];
interface SphereDef {
  at: Ref;
  r: number;
}
export type Limb = 'arm' | 'leg';
export interface PartDef {
  id: string;
  side: Side | 'C';
  limb?: Limb;
  spheres: SphereDef[];
  /** Fill only (no outline); used to hide seams between overlapping parts. */
  patch?: boolean;
}

const sidePart = (s: Side) => [
  {
    id: `thigh${s}`,
    side: s,
    limb: 'leg',
    spheres: [
      { at: `hip${s}`, r: 0.088 },
      { at: [`hip${s}`, `knee${s}`, 0.3], r: 0.085 },
      { at: `knee${s}`, r: 0.055 },
    ],
  },
  {
    id: `shin${s}`,
    side: s,
    limb: 'leg',
    spheres: [
      { at: `knee${s}`, r: 0.052 },
      { at: [`knee${s}`, `ankle${s}`, 0.3], r: 0.056 },
      { at: `ankle${s}`, r: 0.034 },
    ],
  },
  {
    id: `foot${s}`,
    side: s,
    limb: 'leg',
    spheres: [
      { at: `ankle${s}`, r: 0.036 },
      { at: `heel${s}`, r: 0.034 },
      { at: `ball${s}`, r: 0.03 },
      { at: `toe${s}`, r: 0.02 },
    ],
  },
  {
    id: `upperArm${s}`,
    side: s,
    limb: 'arm',
    spheres: [
      { at: `shoulder${s}`, r: 0.058 },
      { at: [`shoulder${s}`, `elbow${s}`, 0.35], r: 0.052 },
      { at: `elbow${s}`, r: 0.04 },
    ],
  },
  {
    id: `forearm${s}`,
    side: s,
    limb: 'arm',
    spheres: [
      { at: `elbow${s}`, r: 0.041 },
      { at: [`elbow${s}`, `wrist${s}`, 0.3], r: 0.042 },
      { at: `wrist${s}`, r: 0.028 },
    ],
  },
  {
    id: `hand${s}`,
    side: s,
    limb: 'arm',
    spheres: [
      { at: `wrist${s}`, r: 0.03 },
      { at: [`wrist${s}`, `hand${s}`, 0.55], r: 0.033 },
      { at: `hand${s}`, r: 0.02 },
    ],
  },
];

export const PARTS: PartDef[] = [
  {
    id: 'pelvis',
    side: 'C',
    spheres: [
      { at: 'pelvis', r: 0.12 },
      { at: 'hipL', r: 0.095 },
      { at: 'hipR', r: 0.095 },
      { at: 'waist', r: 0.11 },
    ],
  },
  {
    id: 'chest',
    side: 'C',
    spheres: [
      { at: 'waist', r: 0.11 },
      { at: 'chestMid', r: 0.135 },
      { at: 'shoulderL', r: 0.065 },
      { at: 'shoulderR', r: 0.065 },
      { at: 'neckBase', r: 0.075 },
    ],
  },
  {
    id: 'waistPatch',
    side: 'C',
    patch: true,
    spheres: [
      { at: ['pelvis', 'waist', 0.55], r: 0.1 },
      { at: 'waist', r: 0.1 },
      { at: ['waist', 'chestMid', 0.35], r: 0.105 },
    ],
  },
  {
    id: 'neck',
    side: 'C',
    spheres: [
      { at: 'neckBase', r: 0.05 },
      { at: 'headBase', r: 0.048 },
    ],
  },
  {
    id: 'head',
    side: 'C',
    spheres: [
      { at: 'headCenter', r: 0.1 },
      { at: 'face', r: 0.075 },
    ],
  },
  ...(sidePart('L') as PartDef[]),
  ...(sidePart('R') as PartDef[]),
];

export interface Sphere {
  c: Vec3;
  r: number;
}

export function resolveSphere(points: Points, def: SphereDef): Sphere {
  const { at, r } = def;
  const c = typeof at === 'string' ? points[at] : lerpVec(points[at[0]], points[at[1]], at[2]);
  return { c, r };
}

export function partSpheres(points: Points, part: PartDef): Sphere[] {
  return part.spheres.map((s) => resolveSphere(points, s));
}

/** Lowest point of the body (bottom of the lowest sphere). */
export function lowestY(points: Points, include: (p: PartDef) => boolean = () => true) {
  let min = Infinity;
  for (const part of PARTS) {
    if (part.patch || !include(part)) continue;
    for (const s of partSpheres(points, part)) min = Math.min(min, s.c[1] - s.r);
  }
  return min;
}
