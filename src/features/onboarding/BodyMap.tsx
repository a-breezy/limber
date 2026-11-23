import { useMemo } from 'react';
import { resolveSphere } from '../../animation/body';
import { project } from '../../animation/camera';
import { forwardKinematics, type PointName, type Points } from '../../animation/fk';
import { add, rotY, type Mat3, type Vec3 } from '../../animation/math';
import { pose } from '../../animation/pose';
import { buildScene, circlesHull, sceneBounds, toPath, type Bounds } from '../../animation/render';
import { AREA_LABELS, type BodyArea } from '../../domain/types';

type View = 'front' | 'back';
type Ref = PointName | readonly [PointName, PointName, number];
/** A blob on the body: spheres along the skeleton, optionally nudged sideways. */
interface Blob {
  spheres: { at: Ref; r: number; lateral?: number }[];
}

const STANDING = pose(
  { y: 1 },
  {
    'shoulderL.abd': 14,
    'shoulderR.abd': 14,
    'elbowL.flex': 8,
    'elbowR.flex': 8,
    'hipL.abd': 4,
    'hipR.abd': 4,
  },
);

const thigh = (s: 'L' | 'R', from: number, to: number, r: number, lateral = 0): Blob => ({
  spheres: [0, 0.5, 1].map((k) => ({
    at: [`hip${s}`, `knee${s}`, from + (to - from) * k] as const,
    r,
    lateral,
  })),
});
const both = (f: (s: 'L' | 'R') => Blob) => [f('L'), f('R')];

/** Where each area lights up, per view. */
const HIGHLIGHTS: Record<View, Partial<Record<BodyArea, Blob[]>>> = {
  front: {
    shoulders: both((s) => ({
      spheres: [
        { at: `shoulder${s}`, r: 0.07 },
        { at: [`shoulder${s}`, `elbow${s}`, 0.3], r: 0.055 },
      ],
    })),
    hipFlexors: both((s) => thigh(s, 0, 0.2, 0.06, -0.02)),
    quads: both((s) => thigh(s, 0.28, 0.85, 0.06)),
    adductors: both((s) => thigh(s, 0.12, 0.65, 0.032, -0.055)),
    outerThigh: both((s) => thigh(s, 0.08, 0.85, 0.026, 0.06)),
  },
  back: {
    shoulders: both((s) => ({
      spheres: [
        { at: `shoulder${s}`, r: 0.07 },
        { at: [`shoulder${s}`, `elbow${s}`, 0.3], r: 0.055 },
      ],
    })),
    lowBack: [
      {
        spheres: [
          { at: ['pelvis', 'waist', 0.25], r: 0.09 },
          { at: 'waist', r: 0.095 },
        ],
      },
    ],
    hamstrings: both((s) => thigh(s, 0.18, 0.88, 0.06)),
    outerThigh: both((s) => thigh(s, 0.08, 0.85, 0.026, 0.06)),
  },
};

/** Big, forgiving tap targets → the most common area for that spot. */
const HOTSPOTS: Record<View, { area: BodyArea; blobs: Blob[] }[]> = {
  front: [
    { area: 'quads', blobs: both((s) => thigh(s, 0.05, 0.95, 0.095)) },
    { area: 'shoulders', blobs: HIGHLIGHTS.front.shoulders!.map(grow) },
  ],
  back: [
    { area: 'hamstrings', blobs: both((s) => thigh(s, 0.05, 0.95, 0.095)) },
    { area: 'lowBack', blobs: HIGHLIGHTS.back.lowBack!.map(grow) },
    { area: 'shoulders', blobs: HIGHLIGHTS.back.shoulders!.map(grow) },
  ],
};

function grow(b: Blob): Blob {
  return { spheres: b.spheres.map((s) => ({ ...s, r: s.r + 0.035 })) };
}

function blobPath(points: Points, cam: Mat3, blob: Blob) {
  const circles = blob.spheres.map((s) => {
    const base = resolveSphere(points, { at: s.at, r: s.r });
    // Lateral nudge is relative to the limb's side: + = away from the midline.
    const sign = base.c[0] >= 0 ? 1 : -1;
    const c: Vec3 = add(base.c, [sign * (s.lateral ?? 0), 0, 0]);
    return { ...project(cam, c), r: s.r };
  });
  return toPath(circlesHull(circles));
}

interface Props {
  selected: readonly BodyArea[];
  onToggle: (area: BodyArea) => void;
}

/** Front + back mannequin; tap to pick sore spots, selected areas glow. */
export function BodyMap({ selected, onToggle }: Props) {
  const views = useMemo(() => {
    const points = forwardKinematics(STANDING).points;
    return (['front', 'back'] as const).map((view) => {
      const cam = rotY(view === 'front' ? 0 : 180);
      const b: Bounds = sceneBounds(points, cam);
      const pad = 0.08;
      return {
        view,
        cam,
        points,
        viewBox: `${b.minX - pad} ${b.minY - pad} ${b.maxX - b.minX + pad * 2} ${b.maxY - b.minY + pad * 2}`,
        body: buildScene(points, cam).filter((s) => s.tone !== 'shadow'),
      };
    });
  }, []);

  return (
    <div className="grid grid-cols-2 gap-2">
      {views.map(({ view, cam, points, viewBox, body }) => (
        <figure key={view} className="flex flex-col items-center">
          <svg viewBox={viewBox} className="h-80 w-full" aria-label={`Body, ${view} view`}>
            {/* Fade the figure as one layer so overlapping parts don't stack darker. */}
            <g opacity={0.5}>
              {body.map((s) => (
                <path
                  key={s.key}
                  d={s.d}
                  fill="var(--color-mq-mid)"
                  stroke={s.outline ? 'var(--color-mq-line)' : 'none'}
                  strokeWidth={s.outline ? 1.2 : 0}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
            {(Object.entries(HIGHLIGHTS[view]) as [BodyArea, Blob[]][])
              .filter(([area]) => selected.includes(area))
              .flatMap(([area, blobs]) =>
                blobs.map((blob, i) => (
                  <path
                    key={`${area}-${i}`}
                    d={blobPath(points, cam, blob)}
                    fill="var(--color-brand)"
                    opacity={0.85}
                    pointerEvents="none"
                  />
                )),
              )}
            {HOTSPOTS[view].flatMap(({ area, blobs }) =>
              blobs.map((blob, i) => (
                <path
                  key={`hit-${area}-${i}`}
                  d={blobPath(points, cam, blob)}
                  fill="transparent"
                  role="button"
                  aria-label={`${AREA_LABELS[area]} (${view})`}
                  aria-pressed={selected.includes(area)}
                  className="cursor-pointer outline-none"
                  onClick={() => onToggle(area)}
                />
              )),
            )}
          </svg>
          <figcaption className="text-xs font-bold uppercase tracking-widest text-muted">
            {view}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
