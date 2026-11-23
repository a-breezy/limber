import { useMemo } from 'react';
import { Link } from 'react-router';
import { useProfileStore } from '../../app/useProfileStore';
import { AREA_LABELS, BODY_REGIONS, type BodyRegion } from '../../domain/types';
import { isoDate, planWeek, routineForDay } from '../../engine/plan';
import { minutesLabel, RoutineList } from '../routine/RoutineList';

const QUICK_FIX: { region: BodyRegion; emoji: string }[] = [
  { region: 'lowBack', emoji: '🔥' },
  { region: 'thighs', emoji: '⚡' },
  { region: 'shoulders', emoji: '💪' },
];
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function TodayPage() {
  const { status, profile } = useProfileStore();
  const today = useMemo(() => new Date(), []);
  const plan = useMemo(() => {
    if (!profile) return undefined;
    return { week: planWeek(profile, today), ...routineForDay(profile, today) };
  }, [profile, today]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-widest text-brand">Limber</p>
        <h1 className="mt-1 font-display text-4xl font-black leading-tight">
          Let&apos;s get <span className="bg-zap px-1 text-zap-ink">loose.</span>
        </h1>
      </header>

      {status !== 'ready' ? (
        <p className="text-muted">Loading…</p>
      ) : !profile || !plan ? (
        <section className="rounded-card bg-brand p-6 text-brand-ink shadow-lg shadow-brand/30">
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
        </section>
      ) : (
        <>
          <ol className="grid grid-cols-7 gap-1.5" aria-label="This week">
            {plan.week.map((d) => {
              const isToday = d.date === isoDate(today);
              return (
                <li
                  key={d.date}
                  aria-current={isToday ? 'date' : undefined}
                  aria-label={`${d.date}${d.isSessionDay ? ', session day' : ', rest day'}`}
                  className={`flex flex-col items-center gap-1 rounded-xl py-2 text-xs font-bold ${
                    isToday ? 'bg-ink text-bg' : 'text-muted'
                  }`}
                >
                  {WEEKDAYS[d.weekday]}
                  <span
                    aria-hidden
                    className={`size-2 rounded-full ${d.isSessionDay ? 'bg-brand' : 'bg-line'}`}
                  />
                </li>
              );
            })}
          </ol>

          <section className="rounded-card bg-brand p-6 text-brand-ink shadow-lg shadow-brand/30">
            <p className="text-xs font-bold uppercase tracking-widest text-white/80">
              {plan.routine.kind === 'breathing'
                ? 'Gentle reset'
                : plan.day.isSessionDay
                  ? "Today's routine"
                  : 'Rest day · bonus session'}
            </p>
            <h2 className="mt-1 font-display text-3xl font-black">
              {minutesLabel(plan.routine.totalSeconds)} · {plan.routine.items.length} moves
            </h2>
            <p className="mt-1 text-white/90">
              {plan.routine.kind === 'breathing'
                ? 'Breathing only until you’ve been checked by a professional.'
                : plan.routine.focus.length
                  ? `Focus: ${plan.routine.focus.map((a) => AREA_LABELS[a].toLowerCase()).join(', ')}`
                  : 'All-round mobility'}
            </p>
            <Link
              to="/session/today"
              className="mt-5 flex min-h-12 w-full items-center justify-center rounded-full bg-white font-black text-brand"
            >
              {plan.day.isSessionDay || plan.routine.kind === 'breathing'
                ? 'Start'
                : 'Start bonus session'}
            </Link>
          </section>

          <RoutineList routine={plan.routine} />
        </>
      )}

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted">
          Quick fix · 5 min
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {QUICK_FIX.map(({ region, emoji }) =>
            profile ? (
              <Link
                key={region}
                to={`/quick/${region}`}
                className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-card border border-line bg-surface font-bold"
              >
                <span className="text-2xl" aria-hidden>
                  {emoji}
                </span>
                {BODY_REGIONS[region].label}
              </Link>
            ) : (
              <span
                key={region}
                aria-disabled
                className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-card border border-line bg-surface font-bold opacity-60"
              >
                <span className="text-2xl" aria-hidden>
                  {emoji}
                </span>
                {BODY_REGIONS[region].label}
              </span>
            ),
          )}
        </div>
      </section>
    </div>
  );
}
