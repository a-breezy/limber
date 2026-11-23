import { describe, expect, it } from 'vitest';
import { lowestY } from './body';
import { evaluate, mirrorClip, prepareClip, validateClip } from './clip';
import { SPIKE_CLIPS } from './clips';
import { forwardKinematics } from './fk';
import { twoBoneIK } from './ik';
import { distance, type Vec3 } from './math';
import { clampPose, DOFS, DOF_LIMITS, limitViolations, mirrorPose, pose } from './pose';
import { BONES } from './skeleton';

const randomPose = (seed: number) => {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const joints = Object.fromEntries(
    DOFS.map((d) => {
      const [lo, hi] = DOF_LIMITS[d];
      return [d, lo + (hi - lo) * rnd()];
    }),
  );
  return pose({ pitch: rnd() * 180 - 90, yaw: rnd() * 360, roll: rnd() * 40 - 20 }, joints);
};

describe('forward kinematics', () => {
  it('neutral pose stands upright and symmetric', () => {
    const p = forwardKinematics(pose({ y: 1 })).points;
    expect(p.headCenter[1]).toBeGreaterThan(p.neckBase[1]);
    expect(p.neckBase[1]).toBeGreaterThan(p.pelvis[1]);
    expect(p.ankleL[1]).toBeLessThan(p.kneeL[1]);
    expect(p.handL[1]).toBeLessThan(p.elbowL[1]);
    expect(p.shoulderL[0]).toBeCloseTo(-p.shoulderR[0]);
    expect(p.ankleL[0]).toBeCloseTo(-p.ankleR[0]);
    expect(p.face[2]).toBeGreaterThan(p.headCenter[2]); // faces +z
    expect(p.toeL[2]).toBeGreaterThan(p.heelL[2]);
  });

  it('positive flexion moves limbs forward and knees bend backward', () => {
    const p = forwardKinematics(
      pose({}, { 'shoulderL.flex': 90, 'hipL.flex': 90, 'kneeR.flex': 90, 'elbowR.flex': 90 }),
    ).points;
    expect(p.wristL[2]).toBeGreaterThan(0.4);
    expect(p.kneeL[2]).toBeGreaterThan(0.4);
    expect(p.ankleR[2]).toBeLessThan(-0.3);
    expect(p.wristR[2]).toBeGreaterThan(0.2);
  });

  it('never changes bone lengths, whatever the angles', () => {
    for (let seed = 1; seed < 60; seed++) {
      const p = forwardKinematics(randomPose(seed)).points;
      for (const s of ['L', 'R'] as const) {
        expect(distance(p[`shoulder${s}`], p[`elbow${s}`])).toBeCloseTo(BONES.upperArm, 6);
        expect(distance(p[`elbow${s}`], p[`wrist${s}`])).toBeCloseTo(BONES.forearm, 6);
        expect(distance(p[`hip${s}`], p[`knee${s}`])).toBeCloseTo(BONES.thigh, 6);
        expect(distance(p[`knee${s}`], p[`ankle${s}`])).toBeCloseTo(BONES.shin, 6);
      }
    }
  });
});

describe('pose guardrails', () => {
  it('clamps joints into anatomical range', () => {
    const p = clampPose(pose({}, { 'kneeL.flex': -40, 'elbowR.flex': 400 }));
    expect(limitViolations(p)).toEqual([]);
    expect(p.joints['kneeL.flex']).toBe(0);
    expect(p.joints['elbowR.flex']).toBe(150);
  });

  it('mirroring twice is the identity', () => {
    const p = randomPose(7);
    expect(mirrorPose(mirrorPose(p))).toEqual(p);
    expect(mirrorPose(pose({}, { 'kneeL.flex': 30 })).joints).toEqual({ 'kneeR.flex': 30 });
  });
});

describe('two-bone IK', () => {
  const root: Vec3 = [0, 0, 0];
  const mid: Vec3 = [0, -0.3, 0];
  const end: Vec3 = [0, -0.6, 0];

  it('reaches reachable targets and keeps bone lengths', () => {
    const r = twoBoneIK(root, mid, end, [0.2, -0.4, 0.1], [0, 0, 1]);
    expect(r.reached).toBe(true);
    expect(distance(r.end, [0.2, -0.4, 0.1])).toBeLessThan(1e-9);
    expect(distance(root, r.mid)).toBeCloseTo(0.3, 9);
    expect(distance(r.mid, r.end)).toBeCloseTo(0.3, 9);
    expect(r.mid[2]).toBeGreaterThan(0); // bends toward the pole
  });

  it('reports unreachable targets without stretching the limb', () => {
    const r = twoBoneIK(root, mid, end, [0, -2, 0], [0, 0, 1]);
    expect(r.reached).toBe(false);
    expect(distance(root, r.mid)).toBeCloseTo(0.3, 9);
    expect(distance(r.mid, r.end)).toBeCloseTo(0.3, 9);
  });
});

describe.each(SPIKE_CLIPS.map((c) => [c.id, c] as const))('clip %s', (_id, clip) => {
  it('passes every guardrail (limits, floor, reach, bone lengths)', () => {
    expect(validateClip(clip)).toEqual([]);
  });

  it('touches the floor in its first pose', () => {
    const f = evaluate(prepareClip(clip), 0);
    expect(Math.abs(lowestY(f.points))).toBeLessThan(0.01);
  });

  it('mirrors cleanly', () => {
    expect(mirrorClip(mirrorClip(clip))).toEqual(clip);
  });
});

describe('cat-cow specifics', () => {
  it('keeps hands planted while the spine moves', () => {
    const pc = prepareClip(SPIKE_CLIPS[0]!);
    const a = evaluate(pc, 0).points;
    for (let t = 0; t < pc.duration; t += 0.25) {
      const b = evaluate(pc, t).points;
      expect(distance(a.wristL, b.wristL)).toBeLessThan(0.005);
      expect(distance(a.kneeL, b.kneeL)).toBeLessThan(0.02);
    }
  });

  it('actually moves the mid-back: cat higher than cow', () => {
    const clip = SPIKE_CLIPS[0]!;
    const pc = prepareClip(clip);
    const at = (i: number) => {
      const start = pc.starts[i]! + clip.keyframes[i]!.transition - clip.keyframes[0]!.transition;
      return evaluate(pc, start + 0.1).points.waist[1];
    };
    expect(at(1) - at(2)).toBeGreaterThan(0.08);
  });
});
