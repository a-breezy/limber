import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { useProfileStore } from '../../app/useProfileStore';
import { Chip, RangeField } from '../../components/ui';
import { describeDosage, getExercise } from '../../content';
import {
  AREA_LABELS,
  BODY_REGIONS,
  type BodyArea,
  type BodyRegion,
  type SessionRating,
  type UserProfile,
} from '../../domain/types';
import { quickFix, routineForDay } from '../../engine/plan';
import { BLOCK_LABELS, type Routine } from '../../engine/routine';
import { unlockAudio } from '../../lib/feedback';
import { easierAlternatives } from '../../player/alternatives';
import {
  currentRep,
  currentStep,
  overallElapsed,
  secondsLeft,
  totalSeconds,
  type PlayerAction,
  type PlayerState,
} from '../../player/player';
import { store } from '../../storage';
import { minutesLabel } from '../routine/RoutineList';
import { BreathingGuide, ExerciseVisual, fmt, IconButton } from './parts';
import { usePlayer } from './usePlayer';

const MUTE_KEY = 'limber-muted';
const readMuted = () => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
};

/** /session/today or /session/quick/:region */
export function SessionPage() {
  const { region } = useParams();
  const { status, profile } = useProfileStore();
  const routine = useMemo(() => {
    if (!profile) return undefined;
    if (region) {
      return region in BODY_REGIONS ? quickFix(profile, region as BodyRegion) : undefined;
    }
    return routineForDay(profile, new Date()).routine;
  }, [profile, region]);

  if (status !== 'ready') return null;
  if (!profile) return <Navigate to="/onboarding/welcome" replace />;
  if (!routine || !routine.items.length) return <Navigate to="/" replace />;
  return <Session profile={profile} routine={routine} />;
}

function Session({ profile, routine }: { profile: UserProfile; routine: Routine }) {
  const [muted, setMuted] = useState(readMuted);
  const [state, dispatch] = usePlayer(routine.items, muted);
  const [startedAt] = useState(() => new Date().toISOString());
  const [sheet, setSheet] = useState(false);
  const navigate = useNavigate();

  const toggleMute = () => {
    setMuted((m) => {
      try {
        localStorage.setItem(MUTE_KEY, m ? '0' : '1');
      } catch {
        /* per-device convenience only */
      }
      return !m;
    });
  };

  if (state.status === 'ready') {
    return (
      <Ready
        routine={routine}
        onStart={() => {
          unlockAudio();
          dispatch({ type: 'start' });
        }}
      />
    );
  }
  if (state.status === 'done') {
    return (
      <Complete
        profile={profile}
        routine={routine}
        state={state}
        startedAt={startedAt}
        onSaved={() => navigate('/', { replace: true })}
      />
    );
  }

  const step = currentStep(state)!;
  const item = state.items[step.item]!;
  const ex = getExercise(item.exerciseId)!;
  const progress = overallElapsed(state) / totalSeconds(state);

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-3">
        <IconButton label="End session" onClick={() => dispatch({ type: 'pause' })}>
          ✕
        </IconButton>
        <div className="flex-1">
          <div
            className="h-2 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-label="Session progress"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full bg-brand" style={{ width: `${progress * 100}%` }} />
          </div>
          <p className="mt-1 text-xs font-bold text-muted">
            {step.item + 1} of {state.items.length} ·{' '}
            {minutesLabel(totalSeconds(state) - overallElapsed(state))} left
          </p>
        </div>
        <IconButton label={muted ? 'Unmute' : 'Mute'} onClick={toggleMute}>
          {muted ? '🔇' : '🔊'}
        </IconButton>
      </header>

      <main className="flex flex-1 flex-col gap-4 pt-4">
        <StepBody state={state} dispatch={dispatch} />
      </main>

      {step.kind !== 'intro' && (
        <footer className="space-y-3 pt-4">
          <div className="flex items-center justify-center gap-5">
            <IconButton
              label="Previous exercise"
              onClick={() => dispatch({ type: 'prevExercise' })}
            >
              ⏮
            </IconButton>
            <IconButton label="Pause" big onClick={() => dispatch({ type: 'pause' })}>
              ❚❚
            </IconButton>
            <IconButton label="Skip exercise" onClick={() => dispatch({ type: 'skipExercise' })}>
              ⏭
            </IconButton>
          </div>
          {step.kind === 'work' && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => dispatch({ type: 'next' })}
                className="min-h-12 rounded-full border-2 border-ink font-bold"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: 'pause' });
                  setSheet(true);
                }}
                className="min-h-12 rounded-full border-2 border-brand font-bold text-brand"
              >
                Too hard / hurts
              </button>
            </div>
          )}
        </footer>
      )}

      {state.status === 'paused' && !sheet && (
        <Overlay>
          <h2 className="font-display text-3xl font-black">Paused</h2>
          <p className="text-muted">{ex.name}</p>
          <button
            type="button"
            onClick={() => dispatch({ type: 'resume' })}
            className="min-h-14 w-full rounded-full bg-brand font-display text-lg font-black text-brand-ink"
          >
            Resume
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'end' })}
            className="min-h-12 w-full rounded-full border-2 border-line font-bold"
          >
            End session
          </button>
        </Overlay>
      )}

      {sheet && (
        <SwapSheet
          exerciseId={item.exerciseId}
          profile={profile}
          exclude={state.items.map((i) => i.exerciseId)}
          onPick={(id) => {
            dispatch({ type: 'swap', exerciseId: id });
            dispatch({ type: 'resume' });
            setSheet(false);
          }}
          onSkip={() => {
            dispatch({ type: 'skipExercise' });
            dispatch({ type: 'resume' });
            setSheet(false);
          }}
          onClose={() => {
            dispatch({ type: 'resume' });
            setSheet(false);
          }}
        />
      )}
    </div>
  );
}

function StepBody({
  state,
  dispatch,
}: {
  state: PlayerState;
  dispatch: (a: PlayerAction) => void;
}) {
  const step = currentStep(state)!;
  const item = state.items[step.item]!;
  const ex = getExercise(item.exerciseId)!;
  const left = secondsLeft(state);
  const playing = state.status === 'playing';

  if (step.kind === 'intro') {
    return (
      <>
        <p className="text-xs font-bold uppercase tracking-widest text-brand">
          Up next · {BLOCK_LABELS[item.block]}
        </p>
        <h1 className="font-display text-4xl font-black leading-tight">{ex.name}</h1>
        <p className="text-muted">{ex.summary}</p>
        <ExerciseVisual exercise={ex} playing={playing} />
        <p className="text-center font-bold">{describeDosage(item.dosage)}</p>
        <div className="mt-auto space-y-2">
          <button
            type="button"
            onClick={() => dispatch({ type: 'next' })}
            className="min-h-14 w-full rounded-full bg-brand font-display text-lg font-black text-brand-ink shadow-lg shadow-brand/30"
          >
            Start now · {fmt(left)}
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'skipExercise' })}
            className="min-h-11 w-full font-bold text-muted"
          >
            Skip this one
          </button>
        </div>
      </>
    );
  }

  if (step.kind === 'switch' || step.kind === 'rest') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">{ex.name}</p>
        <h1 className="font-display text-5xl font-black">
          {step.kind === 'switch' ? `Switch to ${step.to} side` : 'Rest'}
        </h1>
        {step.kind === 'rest' && <p className="text-muted">Next: set {step.nextSet}</p>}
        <p className="font-display text-7xl font-black text-brand" aria-live="polite">
          {fmt(left)}
        </p>
      </div>
    );
  }

  // Work
  const rep = currentRep(state);
  const cue = ex.cues[Math.floor(state.elapsed / 6) % ex.cues.length];
  return (
    <>
      <div>
        <h1 className="font-display text-3xl font-black leading-tight">{ex.name}</h1>
        <p className="text-sm font-bold text-muted">
          {step.sets > 1 && `Set ${step.set} of ${step.sets}`}
          {step.sets > 1 && step.side && ' · '}
          {step.side && `${step.side === 'right' ? 'Right' : 'Left'} side`}
        </p>
      </div>
      {ex.phase === 'breathe' ? (
        <BreathingGuide elapsed={state.elapsed} />
      ) : (
        <ExerciseVisual exercise={ex} side={step.side} playing={playing} />
      )}
      <p className="text-center font-display text-7xl font-black text-brand" aria-live="off">
        {rep !== undefined ? (
          <>
            {rep}
            <span className="text-3xl text-muted"> / {step.reps}</span>
          </>
        ) : (
          fmt(left)
        )}
      </p>
      <p className="min-h-12 text-center font-bold">{cue}</p>
      {step.mode === 'hold' && <p className="text-center text-sm text-muted">{ex.breath}</p>}
    </>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-20 grid place-items-end bg-ink/40 backdrop-blur-sm sm:place-items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md space-y-3 rounded-t-3xl bg-bg p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center sm:rounded-3xl"
      >
        {children}
      </div>
    </div>
  );
}

function SwapSheet({
  exerciseId,
  profile,
  exclude,
  onPick,
  onSkip,
  onClose,
}: {
  exerciseId: string;
  profile: UserProfile;
  exclude: string[];
  onPick: (id: string) => void;
  onSkip: () => void;
  onClose: () => void;
}) {
  const options = easierAlternatives(exerciseId, profile, exclude);
  return (
    <Overlay>
      <h2 className="font-display text-2xl font-black">No problem.</h2>
      <p className="text-sm text-muted">
        Sharp or pinching pain means stop. Pick an easier option or skip this one.
      </p>
      <div className="space-y-2 text-left">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onPick(o.id)}
            className="block w-full rounded-2xl border-2 border-line bg-surface px-4 py-3"
          >
            <span className="block font-bold">{o.name}</span>
            <span className="block text-sm text-muted">{o.summary}</span>
          </button>
        ))}
        {!options.length && (
          <p className="rounded-2xl bg-surface p-4 text-sm">
            No easier swap suits your profile for this one. Let’s skip it.
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onSkip}
        className="min-h-12 w-full rounded-full bg-brand font-bold text-brand-ink"
      >
        Skip this exercise
      </button>
      <button type="button" onClick={onClose} className="min-h-11 w-full font-bold text-muted">
        Keep going
      </button>
    </Overlay>
  );
}

function Ready({ routine, onStart }: { routine: Routine; onStart: () => void }) {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Link to="/" className="text-sm font-bold text-brand">
        ← Back
      </Link>
      <div className="flex flex-1 flex-col justify-center gap-4 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">
          {routine.kind === 'quickFix' ? 'Quick fix' : 'Your session'}
        </p>
        <h1 className="font-display text-5xl font-black">
          {minutesLabel(routine.totalSeconds)}
          <br />
          {routine.items.length} moves
        </h1>
        <ul className="space-y-1 text-sm text-muted">
          <li>📱 Prop your phone where you can see it</li>
          <li>🔊 Beeps count you in and out</li>
          <li>✋ Sharp pain? Stop, and tap “Too hard / hurts”</li>
        </ul>
      </div>
      <button
        type="button"
        onClick={onStart}
        className="min-h-16 w-full rounded-full bg-brand font-display text-2xl font-black text-brand-ink shadow-lg shadow-brand/30"
      >
        Let&apos;s go
      </button>
    </div>
  );
}

function Complete({
  profile,
  routine,
  state,
  startedAt,
  onSaved,
}: {
  profile: UserProfile;
  routine: Routine;
  state: PlayerState;
  startedAt: string;
  onSaved: () => void;
}) {
  const sore = profile.painPoints.filter((p) => routine.focus.includes(p.area));
  const [feel, setFeel] = useState<Partial<Record<BodyArea, number>>>(() =>
    Object.fromEntries(sore.map((p) => [p.area, p.intensity])),
  );
  const [rating, setRating] = useState<SessionRating>();
  const [saving, setSaving] = useState(false);
  const done = state.completed.length;

  async function save(withCheckIn: boolean) {
    setSaving(true);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    await store.saveSession({
      id,
      startedAt,
      completedAt: now,
      kind: routine.kind,
      focus: routine.focus,
      exerciseIds: routine.items.map((i) => i.exerciseId),
      completedIds: state.completed.map((i) => state.items[i]!.exerciseId),
      skippedIds: state.skipped,
      swaps: state.swaps,
      plannedMinutes: Math.round(routine.targetSeconds / 60),
      activeSeconds: Math.round(state.activeSeconds),
      rating: withCheckIn ? rating : undefined,
    });
    if (withCheckIn) {
      for (const [area, intensity] of Object.entries(feel) as [BodyArea, number][]) {
        await store.addCheckIn({
          id: crypto.randomUUID(),
          sessionId: id,
          at: now,
          area,
          intensity,
        });
      }
    }
    onSaved();
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col gap-6 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="text-center">
        <p className="text-5xl" aria-hidden>
          🎉
        </p>
        <h1 className="mt-2 font-display text-4xl font-black">
          {done === state.items.length ? 'Nailed it.' : 'Nice work.'}
        </h1>
        <p className="mt-1 text-muted">
          {minutesLabel(state.activeSeconds)} · {done} of {state.items.length} moves
          {state.skipped.length ? ` · ${state.skipped.length} skipped` : ''}
        </p>
      </header>

      {sore.map((p) => (
        <RangeField
          key={p.area}
          label={`How ${AREA_LABELS[p.area].endsWith('s') ? 'do' : 'does'} your ${AREA_LABELS[p.area].toLowerCase()} feel now?`}
          value={feel[p.area] ?? p.intensity}
          min={0}
          max={10}
          onChange={(v) => setFeel((f) => ({ ...f, [p.area]: v }))}
          format={(v) => `${v}/10`}
          ends={['Great', 'Awful']}
        />
      ))}

      <fieldset className="space-y-3">
        <legend className="font-bold">How was that?</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {(
            [
              ['tooEasy', 'Too easy'],
              ['justRight', 'Just right'],
              ['tooHard', 'Too hard'],
            ] as const
          ).map(([v, label]) => (
            <Chip key={v} role="radio" selected={rating === v} onClick={() => setRating(v)}>
              {label}
            </Chip>
          ))}
        </div>
      </fieldset>

      <div className="mt-auto space-y-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save(true)}
          className="min-h-14 w-full rounded-full bg-brand font-display text-lg font-black text-brand-ink disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save(false)}
          className="min-h-11 w-full font-bold text-muted"
        >
          Skip check-in
        </button>
      </div>
    </div>
  );
}
