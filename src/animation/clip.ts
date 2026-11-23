import { lowestY, type Limb } from './body';
import type { CameraName } from './camera';
import { forwardKinematics, type Frames, type PointName, type Points } from './fk';
import { twoBoneIK } from './ik';
import { add, angleBetween, apply, distance, lerp, normalize, scale, sub, type Vec3 } from './math';
import { lerpPose, limitViolations, mirrorPose, swapSide, type Pose, type Side } from './pose';
import { BONES } from './skeleton';

export type Effector = 'wristL' | 'wristR' | 'ankleL' | 'ankleR';

/**
 * - plant: the hand/foot stays where it was in the first keyframe, on the floor
 *   (hands on the mat in cat-cow).
 * - point: the hand/foot reaches a body landmark (hand holds ankle in a quad stretch).
 */
export type PinTarget = { kind: 'plant' } | { kind: 'point'; point: PointName; offset?: Vec3 };

export interface Keyframe {
  /** Short instruction shown while this pose plays, e.g. "Round your back". */
  label: string;
  pose: Pose;
  /** Seconds to move into this pose from the previous one. */
  transition: number;
  /** Seconds to hold this pose. */
  hold: number;
  /** 0–1 per pinned effector (default 1). Lets a hand let go / take hold smoothly. */
  pinWeights?: Partial<Record<Effector, number>>;
}

export type Prop = 'mat' | 'band';

export interface Clip {
  id: string;
  name: string;
  camera: CameraName;
  /**
   * first: place the body on the floor using keyframe 1 and keep that height
   * (required with planted pins). perKeyframe: re-ground each keyframe.
   */
  ground: 'first' | 'perKeyframe';
  /** Exercise is done on each side; the player can mirror it. */
  perSide: boolean;
  keyframes: Keyframe[];
  pins?: Partial<Record<Effector, PinTarget>>;
  props?: Prop[];
}

interface Chain {
  root: PointName;
  mid: PointName;
  end: PointName;
  limb: Limb;
  side: Side;
  /** Direction the middle joint should point. */
  pole: (f: Frames) => Vec3;
  attach: PointName[];
}

export const CHAINS: Record<Effector, Chain> = {
  ankleL: {
    root: 'hipL',
    mid: 'kneeL',
    end: 'ankleL',
    limb: 'leg',
    side: 'L',
    pole: (f) => apply(f.thighL, [0, 0, 1]),
    attach: ['heelL', 'ballL', 'toeL'],
  },
  ankleR: {
    root: 'hipR',
    mid: 'kneeR',
    end: 'ankleR',
    limb: 'leg',
    side: 'R',
    pole: (f) => apply(f.thighR, [0, 0, 1]),
    attach: ['heelR', 'ballR', 'toeR'],
  },
  wristL: {
    root: 'shoulderL',
    mid: 'elbowL',
    end: 'wristL',
    limb: 'arm',
    side: 'L',
    pole: (f) => apply(f.upperArmL, [0, 0, -1]),
    attach: ['handL'],
  },
  wristR: {
    root: 'shoulderR',
    mid: 'elbowR',
    end: 'wristR',
    limb: 'arm',
    side: 'R',
    pole: (f) => apply(f.upperArmR, [0, 0, -1]),
    attach: ['handR'],
  },
};
/** Legs first: a hand may be pinned to a foot. */
const SOLVE_ORDER: Effector[] = ['ankleL', 'ankleR', 'wristL', 'wristR'];
/** Wrist height when the palm is flat on the floor. */
const HAND_PLANT_Y = 0.034;

interface Plant {
  end: Vec3;
  /** Hand/foot landmarks relative to the wrist/ankle, frozen from keyframe 1. */
  attach: Partial<Record<PointName, Vec3>>;
}

export interface PreparedClip {
  clip: Clip;
  mirrored: boolean;
  duration: number;
  starts: number[];
  offsets: number[];
  plants: Partial<Record<Effector, Plant>>;
}

export interface Frame {
  points: Points;
  keyframeIndex: number;
  label: string;
  phase: 'moving' | 'holding';
  /** Distance (m) each pinned effector is short of its target. */
  misses: Partial<Record<Effector, number>>;
  weights: Partial<Record<Effector, number>>;
}

const swapKeys = <K extends string, V>(rec: Partial<Record<K, V>> | undefined, f?: (v: V) => V) =>
  rec &&
  (Object.fromEntries(
    Object.entries(rec).map(([k, v]) => [swapSide(k), f ? f(v as V) : v]),
  ) as Partial<Record<K, V>>);

/** The same exercise on the other side of the body. */
export function mirrorClip(clip: Clip): Clip {
  return {
    ...clip,
    keyframes: clip.keyframes.map((k) => ({
      ...k,
      pose: mirrorPose(k.pose),
      pinWeights: swapKeys(k.pinWeights),
    })),
    pins: swapKeys(clip.pins, (t: PinTarget) =>
      t.kind === 'point'
        ? {
            ...t,
            point: swapSide(t.point),
            offset: t.offset && [-t.offset[0], t.offset[1], t.offset[2]],
          }
        : t,
    ),
  };
}

const weightsOf = (clip: Clip, k: Keyframe) => {
  const w: Partial<Record<Effector, number>> = {};
  for (const e of Object.keys(clip.pins ?? {}) as Effector[]) w[e] = k.pinWeights?.[e] ?? 1;
  return w;
};

const shift = (p: Pose, dy: number): Pose => ({ ...p, root: { ...p.root, y: p.root.y + dy } });

function solve(
  clip: Clip,
  pose: Pose,
  weights: Partial<Record<Effector, number>>,
  plants: Partial<Record<Effector, Plant>>,
) {
  const { points: fk, frames } = forwardKinematics(pose);
  const points: Points = { ...fk };
  const misses: Partial<Record<Effector, number>> = {};

  for (const eff of SOLVE_ORDER) {
    const pin = clip.pins?.[eff];
    const w = weights[eff] ?? 0;
    if (!pin || w <= 0) continue;
    const ch = CHAINS[eff];
    const plant = pin.kind === 'plant' ? plants[eff] : undefined;
    let target: Vec3;
    if (pin.kind === 'plant') {
      if (!plant) continue;
      target = plant.end;
    } else {
      target = add(points[pin.point], pin.offset ?? [0, 0, 0]);
    }
    const goal: Vec3 = [
      lerp(points[ch.end][0], target[0], w),
      lerp(points[ch.end][1], target[1], w),
      lerp(points[ch.end][2], target[2], w),
    ];
    const r = twoBoneIK(points[ch.root], points[ch.mid], points[ch.end], goal, ch.pole(frames));
    const oldEnd = points[ch.end];
    points[ch.mid] = r.mid;
    points[ch.end] = r.end;
    misses[eff] = distance(r.end, goal);

    for (const a of ch.attach) {
      if (plant?.attach[a] && w >= 1) {
        points[a] = add(r.end, plant.attach[a]!);
      } else if (ch.limb === 'arm') {
        // Hand continues along the forearm.
        points[a] = add(r.end, scale(normalize(sub(r.end, r.mid)), BONES.hand));
      } else {
        points[a] = add(points[a], sub(r.end, oldEnd));
      }
    }
  }
  return { points, misses };
}

export function prepareClip(source: Clip, mirrored = false): PreparedClip {
  const clip = mirrored ? mirrorClip(source) : source;
  const kfs = clip.keyframes;
  if (kfs.length === 0) throw new Error(`Clip ${clip.id} has no keyframes`);

  const starts: number[] = [];
  let acc = 0;
  for (const k of kfs) {
    starts.push(acc);
    acc += k.transition + k.hold;
  }

  const plantedLimbs = new Set(
    (Object.entries(clip.pins ?? {}) as [Effector, PinTarget][])
      .filter(([, t]) => t.kind === 'plant')
      .map(([e]) => `${CHAINS[e].limb}${CHAINS[e].side}`),
  );
  const notPlanted = (p: { limb?: Limb; side: string }) =>
    !p.limb || !plantedLimbs.has(`${p.limb}${p.side}`);

  const groundOffset = (k: Keyframe) =>
    -lowestY(solve(clip, k.pose, weightsOf(clip, k), {}).points, notPlanted);

  const first = kfs[0]!;
  const offset0 = groundOffset(first);
  const offsets = kfs.map((k) => (clip.ground === 'first' ? offset0 : groundOffset(k)));

  // Freeze planted hands/feet where keyframe 1 puts them.
  const plants: Partial<Record<Effector, Plant>> = {};
  const fk0 = forwardKinematics(shift(first.pose, offset0)).points;
  for (const [eff, t] of Object.entries(clip.pins ?? {}) as [Effector, PinTarget][]) {
    if (t.kind !== 'plant') continue;
    const ch = CHAINS[eff];
    const raw = fk0[ch.end];
    const end: Vec3 = ch.limb === 'arm' ? [raw[0], HAND_PLANT_Y, raw[2]] : raw;
    const attach: Plant['attach'] = {};
    for (const a of ch.attach) attach[a] = sub(fk0[a], raw);
    plants[eff] = { end, attach };
  }

  return { clip, mirrored, duration: acc, starts, offsets, plants };
}

const easeInOut = (u: number) => -(Math.cos(Math.PI * u) - 1) / 2;

/**
 * Pose at time t (seconds). t = 0 is the start of the first keyframe's hold,
 * and the clip loops.
 */
export function evaluate(pc: PreparedClip, t: number): Frame {
  const { clip, duration, starts, offsets } = pc;
  const kfs = clip.keyframes;
  const local = (((t + kfs[0]!.transition) % duration) + duration) % duration;

  let i = kfs.length - 1;
  while (i > 0 && starts[i]! > local) i--;
  const k = kfs[i]!;
  const into = local - starts[i]!;
  const prevI = (i - 1 + kfs.length) % kfs.length;
  const prev = kfs[prevI]!;

  let pose: Pose;
  let offset: number;
  let weights: Partial<Record<Effector, number>>;
  let phase: Frame['phase'];
  if (into < k.transition) {
    const u = easeInOut(into / k.transition);
    pose = lerpPose(prev.pose, k.pose, u);
    offset = lerp(offsets[prevI]!, offsets[i]!, u);
    const wa = weightsOf(clip, prev);
    const wb = weightsOf(clip, k);
    weights = {};
    for (const e of Object.keys(wb) as Effector[]) weights[e] = lerp(wa[e] ?? 1, wb[e] ?? 1, u);
    phase = 'moving';
  } else {
    pose = k.pose;
    offset = offsets[i]!;
    weights = weightsOf(clip, k);
    phase = 'holding';
  }

  const { points, misses } = solve(clip, shift(pose, offset), weights, pc.plants);
  return { points, keyframeIndex: i, label: k.label, phase, misses, weights };
}

// ---------------------------------------------------------------------------
// Guardrails
// ---------------------------------------------------------------------------

const BONE_CHECKS: [string, string, number][] = [
  ['shoulder', 'elbow', BONES.upperArm],
  ['elbow', 'wrist', BONES.forearm],
  ['hip', 'knee', BONES.thigh],
  ['knee', 'ankle', BONES.shin],
];

/**
 * Checks an exercise animation is physically sensible. Returns human-readable
 * problems; an empty list means it passes.
 */
export function validateClip(clip: Clip, samples = 120): string[] {
  const issues: string[] = [];

  clip.keyframes.forEach((k, i) => {
    for (const v of limitViolations(k.pose)) {
      issues.push(
        `Keyframe ${i + 1} "${k.label}": ${v.dof} = ${v.value}° is outside ${v.min}°…${v.max}°`,
      );
    }
  });
  if (
    clip.ground === 'perKeyframe' &&
    Object.values(clip.pins ?? {}).some((p) => p.kind === 'plant')
  ) {
    issues.push('Planted pins need ground: "first"');
  }

  for (const mirrored of clip.perSide ? [false, true] : [false]) {
    const pc = prepareClip(clip, mirrored);
    const tag = mirrored ? ' (other side)' : '';
    const seen = new Set<string>();
    const report = (key: string, msg: string) => {
      if (!seen.has(key)) {
        seen.add(key);
        issues.push(msg + tag);
      }
    };

    for (let n = 0; n < samples; n++) {
      const t = (n / samples) * pc.duration;
      const f = evaluate(pc, t);
      const at = `at ${t.toFixed(2)}s`;
      const low = lowestY(f.points);
      if (low < -0.015)
        report('floor', `Body goes ${(-low * 100).toFixed(1)} cm through the floor ${at}`);

      for (const [eff, miss] of Object.entries(f.misses) as [Effector, number][]) {
        if ((f.weights[eff] ?? 0) >= 0.999 && miss > 0.01) {
          report(
            `reach-${eff}`,
            `${eff} can't reach its target (short by ${(miss * 100).toFixed(1)} cm) ${at}`,
          );
        }
      }

      for (const s of ['L', 'R'] as const) {
        for (const [a, b, len] of BONE_CHECKS) {
          const d = distance(f.points[`${a}${s}` as PointName], f.points[`${b}${s}` as PointName]);
          if (Math.abs(d - len) > 0.002)
            report(`bone-${a}${s}`, `${a}${s}→${b}${s} changed length ${at}`);
        }
        const elbow = angleBetween(
          sub(f.points[`elbow${s}`], f.points[`shoulder${s}`]),
          sub(f.points[`wrist${s}`], f.points[`elbow${s}`]),
        );
        if (elbow > 152) report(`elbow${s}`, `elbow${s} bends ${elbow.toFixed(0)}° ${at}`);
        const knee = angleBetween(
          sub(f.points[`knee${s}`], f.points[`hip${s}`]),
          sub(f.points[`ankle${s}`], f.points[`knee${s}`]),
        );
        if (knee > 157) report(`knee${s}`, `knee${s} bends ${knee.toFixed(0)}° ${at}`);
      }
    }
  }
  return issues;
}
