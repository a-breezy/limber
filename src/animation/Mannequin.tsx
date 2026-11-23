import { useEffect, useMemo, useRef, useState } from 'react';
import { cameraMatrix, type CameraName } from './camera';
import { evaluate, prepareClip, type Clip, type Frame } from './clip';
import { buildScene, sceneBounds, type Bounds, type Tone } from './render';

interface Props {
  clip: Clip;
  camera?: CameraName;
  /** Show the other side of a one-sided exercise. */
  mirrored?: boolean;
  playing?: boolean;
  speed?: number;
  /** Controlled time in seconds (overrides internal playback). */
  time?: number;
  onFrame?: (f: Frame, t: number, duration: number) => void;
  className?: string;
}

const FILL: Record<Tone, string> = {
  far: 'var(--color-mq-far)',
  mid: 'var(--color-mq-mid)',
  near: 'var(--color-mq-near)',
  shadow: 'var(--color-mq-shadow)',
  mat: 'var(--color-mq-mat)',
  band: 'none',
};

/** Renders an exercise clip as an animated mannequin (SVG). */
export function Mannequin({
  clip,
  camera,
  mirrored = false,
  playing = true,
  speed = 1,
  time,
  onFrame,
  className,
}: Props) {
  const cam = camera ?? clip.camera;
  const prepared = useMemo(() => prepareClip(clip, mirrored), [clip, mirrored]);
  const matrix = useMemo(() => cameraMatrix(cam, mirrored), [cam, mirrored]);

  // Fixed framing for the whole clip so the figure never jitters or rescales.
  const viewBox = useMemo(() => {
    let b: Bounds | undefined;
    const n = 48;
    for (let i = 0; i < n; i++) {
      b = sceneBounds(evaluate(prepared, (i / n) * prepared.duration).points, matrix, b);
    }
    const pad = 0.12;
    const { minX, minY, maxX, maxY } = b!;
    // Always include the floor and leave room for the mat.
    const bottom = Math.max(maxY, 0.05);
    const w = maxX - minX + pad * 2;
    const h = bottom - minY + pad * 2;
    return `${minX - pad} ${minY - pad} ${w} ${h}`;
  }, [prepared, matrix]);

  const [internalT, setInternalT] = useState(0);
  const t = time ?? internalT;
  const last = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!playing || time !== undefined) return;
    let raf = 0;
    const tick = (now: number) => {
      const dt = last.current === undefined ? 0 : (now - last.current) / 1000;
      last.current = now;
      setInternalT((x) => (x + Math.min(dt, 0.1) * speed) % prepared.duration);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      last.current = undefined;
    };
  }, [playing, speed, time, prepared.duration]);

  // The mat stays put: centre it under the body's first pose.
  const matCenter = useMemo(() => {
    const p = evaluate(prepared, 0).points;
    return [(p.pelvis[0] + p.neckBase[0]) / 2, (p.pelvis[2] + p.neckBase[2]) / 2] as const;
  }, [prepared]);

  const frame = useMemo(() => evaluate(prepared, t), [prepared, t]);
  const shapes = useMemo(
    () => buildScene(frame.points, matrix, { props: clip.props, matCenter }),
    [frame, matrix, clip.props, matCenter],
  );

  useEffect(() => {
    onFrame?.(frame, t, prepared.duration);
  }, [frame, t, prepared.duration, onFrame]);

  return (
    <svg
      viewBox={viewBox}
      className={className}
      role="img"
      aria-label={`${clip.name}: ${frame.label}`}
    >
      {shapes.map((s) =>
        s.stroke ? (
          <path
            key={s.key}
            d={s.d}
            fill="none"
            stroke="var(--color-brand)"
            strokeWidth={0.018}
            strokeLinecap="round"
          />
        ) : (
          <path
            key={s.key}
            d={s.d}
            fill={FILL[s.tone]}
            stroke={s.outline ? 'var(--color-mq-line)' : 'none'}
            strokeWidth={s.outline ? 1.5 : 0}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ),
      )}
    </svg>
  );
}
