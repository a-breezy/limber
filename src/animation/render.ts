import { PARTS, partSpheres, type Sphere } from './body';
import { project, type Projected } from './camera';
import type { Points } from './fk';
import { lerpVec, type Mat3, type Vec3 } from './math';
import type { Prop } from './clip';

export type Tone = 'far' | 'mid' | 'near' | 'shadow' | 'mat' | 'band';

export interface Shape {
  key: string;
  d: string;
  tone: Tone;
  depth: number;
  /** Outline it? (patches and props don't). */
  outline: boolean;
  /** Stroke-only shape (e.g. the band). */
  stroke?: boolean;
}

type Pt = readonly [number, number];
const SAMPLES = 28;
// The head always covers the neck (from the back too), and both beat the chest on ties.
const DEPTH_BIAS: Record<string, number> = { neck: 0.004, head: 0.08 };

/** Convex hull (Andrew's monotone chain). */
export function convexHull(points: Pt[]): Pt[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o: Pt, a: Pt, b: Pt) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Pt[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0)
      upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return [...lower, ...upper];
}

/** Outline of a set of circles (projected spheres). */
export function circlesHull(circles: { x: number; y: number; r: number }[]): Pt[] {
  const pts: Pt[] = [];
  for (const c of circles) {
    for (let i = 0; i < SAMPLES; i++) {
      const a = (i / SAMPLES) * Math.PI * 2;
      pts.push([c.x + Math.cos(a) * c.r, c.y + Math.sin(a) * c.r]);
    }
  }
  return convexHull(pts);
}

const f = (n: number) => n.toFixed(4);
export const toPath = (pts: Pt[]) =>
  pts.length ? `M${pts.map((p) => `${f(p[0])},${f(p[1])}`).join('L')}Z` : '';

function projectSpheres(cam: Mat3, spheres: Sphere[]) {
  return spheres.map((s) => ({ ...project(cam, s.c), r: s.r }));
}

const avgDepth = (ps: Projected[]) => ps.reduce((a, p) => a + p.depth, 0) / ps.length;

export interface SceneOptions {
  props?: Prop[];
  /** World-space centre of the mat (x, z). */
  matCenter?: readonly [number, number];
}

/** Turn solved body points into depth-sorted 2D shapes for one camera. */
export function buildScene(points: Points, cam: Mat3, opts: SceneOptions = {}): Shape[] {
  const body: Shape[] = [];
  let torsoDepth = 0;

  const projectedParts = PARTS.map((part) => {
    const circles = projectSpheres(cam, partSpheres(points, part));
    return { part, circles, depth: avgDepth(circles) };
  });
  const chest = projectedParts.find((p) => p.part.id === 'chest');
  const pelvis = projectedParts.find((p) => p.part.id === 'pelvis');
  if (chest && pelvis) torsoDepth = (chest.depth + pelvis.depth) / 2;

  for (const { part, circles, depth } of projectedParts) {
    let tone: Tone = 'mid';
    if (part.side !== 'C') {
      // Which side of the body is toward the camera?
      const hip = project(cam, points[`hip${part.side}`]).depth;
      const otherHip = project(cam, points[`hip${part.side === 'L' ? 'R' : 'L'}`]).depth;
      if (hip - otherHip > 0.02) tone = 'near';
      else if (otherHip - hip > 0.02) tone = 'far';
      else tone = depth > torsoDepth + 0.05 ? 'near' : 'mid';
    }
    body.push({
      key: part.id,
      d: toPath(circlesHull(circles)),
      tone,
      // The head and neck win ties against the chest.
      depth: depth + (DEPTH_BIAS[part.id] ?? 0),
      outline: !part.patch,
    });
  }

  // Keep the seam patch directly on top of the torso pieces it covers.
  const torsoTop = Math.max(chest?.depth ?? 0, pelvis?.depth ?? 0);
  const patch = body.find((s) => s.key === 'waistPatch');
  if (patch) patch.depth = torsoTop + 0.0001;

  const shapes: Shape[] = [];

  // Floor props + contact shadow go underneath everything.
  if (opts.props?.includes('mat')) {
    const [cx, cz] = opts.matCenter ?? [0, 0];
    const corners: Vec3[] = [];
    for (const x of [-0.32, 0.32]) {
      for (const z of [-0.92, 0.92]) {
        for (const y of [0, 0.006]) corners.push([cx + x, y, cz + z]);
      }
    }
    const pts = corners.map((c) => project(cam, c));
    shapes.push({
      key: 'mat',
      d: toPath(convexHull(pts.map((p) => [p.x, p.y] as Pt))),
      tone: 'mat',
      depth: -Infinity,
      outline: false,
    });
  }

  const shadowCircles = PARTS.filter((p) => !p.patch)
    .flatMap((p) => partSpheres(points, p))
    .filter((s) => s.c[1] < 0.6)
    .map((s) => ({ ...project(cam, [s.c[0], 0.004, s.c[2]]), r: s.r * (1 - s.c[1]) }));
  if (shadowCircles.length) {
    shapes.push({
      key: 'shadow',
      d: toPath(circlesHull(shadowCircles)),
      tone: 'shadow',
      depth: -Infinity,
      outline: false,
    });
  }

  if (opts.props?.includes('band')) {
    const a = project(cam, lerpVec(points.wristL, points.handL, 0.45));
    const b = project(cam, lerpVec(points.wristR, points.handR, 0.45));
    body.push({
      key: 'band',
      d: `M${f(a.x)},${f(a.y)}L${f(b.x)},${f(b.y)}`,
      tone: 'band',
      // The band runs hand-to-hand in front of the body, so it always draws on top.
      depth: Infinity,
      outline: false,
      stroke: true,
    });
  }

  body.sort((a, b) => a.depth - b.depth);
  return [...shapes, ...body];
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function sceneBounds(points: Points, cam: Mat3, into?: Bounds): Bounds {
  const b = into ?? { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const part of PARTS) {
    for (const s of partSpheres(points, part)) {
      const p = project(cam, s.c);
      b.minX = Math.min(b.minX, p.x - s.r);
      b.maxX = Math.max(b.maxX, p.x + s.r);
      b.minY = Math.min(b.minY, p.y - s.r);
      b.maxY = Math.max(b.maxY, p.y + s.r);
    }
  }
  return b;
}
