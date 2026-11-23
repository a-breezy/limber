import { add, clamp, cross, distance, dot, length, normalize, scale, sub, type Vec3 } from './math';

export interface TwoBoneResult {
  mid: Vec3;
  end: Vec3;
  /** False when the target was out of reach and the limb was stretched/folded to the limit. */
  reached: boolean;
}

/**
 * Analytic two-bone IK (shoulder→elbow→wrist, hip→knee→ankle).
 * Bone lengths are preserved exactly. `pole` is the direction the middle joint
 * should bulge toward (e.g. elbows point back, knees point forward), which
 * guarantees the joint never bends the wrong way.
 */
export function twoBoneIK(
  root: Vec3,
  mid: Vec3,
  end: Vec3,
  target: Vec3,
  pole: Vec3,
): TwoBoneResult {
  const l1 = distance(root, mid);
  const l2 = distance(mid, end);
  const toTarget = sub(target, root);
  const d = length(toTarget);
  const n = d > 1e-9 ? scale(toTarget, 1 / d) : normalize(sub(end, root));

  const minD = Math.abs(l1 - l2) + 1e-6;
  const maxD = l1 + l2 - 1e-6;
  const dc = clamp(d, minD, maxD);

  let m = sub(pole, scale(n, dot(pole, n)));
  if (length(m) < 1e-6) {
    // Pole parallel to the reach direction: pick any perpendicular.
    m = cross(n, Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]);
  }
  m = normalize(m);

  const cosA = clamp((l1 * l1 + dc * dc - l2 * l2) / (2 * l1 * dc), -1, 1);
  const sinA = Math.sqrt(1 - cosA * cosA);
  const newMid = add(root, add(scale(n, l1 * cosA), scale(m, l1 * sinA)));
  const newEnd = add(root, scale(n, dc));

  return { mid: newMid, end: newEnd, reached: Math.abs(d - dc) < 1e-4 };
}
