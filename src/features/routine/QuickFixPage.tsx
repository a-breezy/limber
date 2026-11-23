import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { useProfileStore } from '../../app/useProfileStore';
import { BODY_REGIONS, type BodyRegion } from '../../domain/types';
import { quickFix } from '../../engine/plan';
import { minutesLabel, RoutineList } from './RoutineList';

export function QuickFixPage() {
  const { region } = useParams();
  const { status, profile } = useProfileStore();
  const valid = region && region in BODY_REGIONS;
  const routine = useMemo(
    () => (profile && valid ? quickFix(profile, region as BodyRegion) : undefined),
    [profile, region, valid],
  );

  if (!valid) return <Navigate to="/" replace />;
  if (status === 'ready' && !profile) return <Navigate to="/onboarding/welcome" replace />;
  if (!routine) return <p className="text-muted">Loading…</p>;

  return (
    <div className="space-y-6">
      <header>
        <Link to="/" className="text-sm font-bold text-brand">
          ← Today
        </Link>
        <p className="mt-3 text-xs font-bold uppercase tracking-widest text-brand">Quick fix</p>
        <h1 className="font-display text-3xl font-black">
          {BODY_REGIONS[region as BodyRegion].label} · {minutesLabel(routine.totalSeconds)}
        </h1>
      </header>
      <button
        type="button"
        disabled
        className="min-h-12 w-full rounded-full bg-brand font-black text-brand-ink disabled:opacity-70"
      >
        Start · guided player coming next
      </button>
      <RoutineList routine={routine} />
    </div>
  );
}
