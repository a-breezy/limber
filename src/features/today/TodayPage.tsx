import { Link } from 'react-router';
import { useProfileStore } from '../../app/useProfileStore';
import { AREA_LABELS, BODY_REGIONS } from '../../domain/types';

const quickFix = [
  { region: BODY_REGIONS.lowBack.label, emoji: '🔥' },
  { region: BODY_REGIONS.thighs.label, emoji: '⚡' },
  { region: BODY_REGIONS.shoulders.label, emoji: '💪' },
];

export function TodayPage() {
  const { status, profile } = useProfileStore();
  const ready = status === 'ready';

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-widest text-brand">Limber</p>
        <h1 className="mt-1 font-display text-4xl font-black leading-tight">
          Let&apos;s get <span className="bg-zap px-1 text-zap-ink">loose.</span>
        </h1>
      </header>

      <section className="rounded-card bg-brand p-6 text-brand-ink shadow-lg shadow-brand/30">
        {!ready ? (
          <p>Loading…</p>
        ) : profile ? (
          <>
            <h2 className="font-display text-2xl font-black">Today&apos;s routine</h2>
            {profile.redFlags.length > 0 ? (
              <p className="mt-2 text-white/90">
                You flagged symptoms that need a professional. Until you’ve been checked, we’ll
                stick to gentle breathing sessions.
              </p>
            ) : (
              <p className="mt-2 text-white/90">
                {profile.schedule.minutesPerSession} minutes focused on{' '}
                {profile.painPoints.length
                  ? profile.painPoints.map((p) => AREA_LABELS[p.area].toLowerCase()).join(', ')
                  : 'all-round mobility'}
                . Routines arrive with the routine builder (Phase 4).
              </p>
            )}
            <button
              type="button"
              disabled
              className="mt-5 min-h-12 w-full rounded-full bg-white font-black text-brand disabled:opacity-60"
            >
              Start session · coming soon
            </button>
          </>
        ) : (
          <>
            <h2 className="font-display text-2xl font-black">Build your routine</h2>
            <p className="mt-2 text-white/90">
              Tell us what hurts and how you move. We&apos;ll build a 10–25 minute routine just for
              you.
            </p>
            <Link
              to="/onboarding/welcome"
              className="mt-5 flex min-h-12 w-full items-center justify-center rounded-full bg-white font-black text-brand"
            >
              Get started
            </Link>
          </>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted">Quick fix</h2>
        <div className="grid grid-cols-3 gap-3">
          {quickFix.map((a) => (
            <button
              key={a.region}
              type="button"
              disabled
              className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-card border border-line bg-surface font-bold disabled:opacity-70"
            >
              <span className="text-2xl" aria-hidden>
                {a.emoji}
              </span>
              {a.region}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
