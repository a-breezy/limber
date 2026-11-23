import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { CAMERAS, type CameraName } from '../../animation/camera';
import { validateClip, type Clip, type Frame } from '../../animation/clip';
import { SPIKE_CLIPS } from '../../animation/clips';
import { Mannequin } from '../../animation/Mannequin';

/** Dev-only page: every exercise animation, with guardrail results. */
export function PoseGallery() {
  return (
    <div className="space-y-6">
      <header>
        <Link to="/settings" className="text-sm font-bold text-brand">
          ← Settings
        </Link>
        <h1 className="mt-2 font-display text-3xl font-black">Pose gallery</h1>
        <p className="mt-1 text-sm text-muted">
          Animation test bench. Every clip is checked for joint limits, floor contact, reach and
          bone lengths.
        </p>
      </header>
      {SPIKE_CLIPS.map((clip) => (
        <ClipCard key={clip.id} clip={clip} />
      ))}
    </div>
  );
}

function ClipCard({ clip }: { clip: Clip }) {
  const [camera, setCamera] = useState<CameraName>(clip.camera);
  const [mirrored, setMirrored] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [scrub, setScrub] = useState<number>();
  const [status, setStatus] = useState({ label: '', t: 0, duration: 1 });
  const issues = useMemo(() => validateClip(clip), [clip]);

  const onFrame = useCallback((f: Frame, t: number, duration: number) => {
    setStatus((s) =>
      s.label === f.label && Math.abs(s.t - t) < 0.05 && s.duration === duration
        ? s
        : { label: f.label, t, duration },
    );
  }, []);

  return (
    <section className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="flex items-baseline justify-between px-5 pt-4">
        <h2 className="font-display text-xl font-black">{clip.name}</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
            issues.length ? 'bg-red-600 text-white' : 'bg-zap text-zap-ink'
          }`}
        >
          {issues.length ? `${issues.length} issue${issues.length > 1 ? 's' : ''}` : '✓ guardrails'}
        </span>
      </div>

      <Mannequin
        clip={clip}
        camera={camera}
        mirrored={mirrored}
        playing={playing}
        speed={speed}
        time={scrub}
        onFrame={onFrame}
        className="aspect-square w-full"
      />

      <p className="min-h-12 px-5 text-center font-bold" aria-live="polite">
        {status.label}
      </p>

      <div className="space-y-3 px-5 pb-5">
        <input
          type="range"
          aria-label="Scrub"
          min={0}
          max={status.duration}
          step={0.01}
          value={scrub ?? status.t}
          onChange={(e) => {
            setPlaying(false);
            setScrub(Number(e.target.value));
          }}
          className="w-full accent-brand"
        />
        <div className="flex flex-wrap gap-2">
          <Chip
            active={playing}
            onClick={() => {
              setScrub(undefined);
              setPlaying((p) => !p);
            }}
          >
            {playing ? 'Pause' : 'Play'}
          </Chip>
          <Chip
            active={speed !== 1}
            onClick={() => setSpeed((s) => (s === 1 ? 0.5 : s === 0.5 ? 2 : 1))}
          >
            {speed}×
          </Chip>
          {clip.perSide && (
            <Chip active={mirrored} onClick={() => setMirrored((m) => !m)}>
              {mirrored ? 'Left side' : 'Right side'}
            </Chip>
          )}
          {(Object.keys(CAMERAS) as CameraName[]).map((c) => (
            <Chip key={c} active={camera === c} onClick={() => setCamera(c)}>
              {CAMERAS[c].label}
            </Chip>
          ))}
        </div>
        {issues.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-red-600">
            {issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-10 rounded-full px-4 text-sm font-bold ${
        active ? 'bg-ink text-bg' : 'border border-line text-ink'
      }`}
    >
      {children}
    </button>
  );
}
