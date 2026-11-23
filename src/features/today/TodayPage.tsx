import { useProfileStore } from '../../app/useProfileStore';

const focusAreas = [
  { label: 'Low back', emoji: '🔥' },
  { label: 'Thighs', emoji: '⚡' },
  { label: 'Shoulders', emoji: '💪' },
];

export function TodayPage() {
  const { status, profile } = useProfileStore();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-widest text-brand">Limber</p>
        <h1 className="mt-1 font-display text-4xl font-black leading-tight">
          Let&apos;s get <span className="bg-zap px-1 text-zap-ink">loose.</span>
        </h1>
      </header>

      <section className="rounded-card bg-brand p-6 text-brand-ink shadow-lg shadow-brand/30">
        <h2 className="font-display text-2xl font-black">
          {profile ? "Today's routine" : 'Build your routine'}
        </h2>
        <p className="mt-2 text-white/90">
          {status !== 'ready'
            ? 'Loading…'
            : profile
              ? 'Your personalized routine shows up here once the routine engine is built.'
              : 'Tell us what hurts and how you move. We will build a 10–25 minute routine just for you.'}
        </p>
        <button
          type="button"
          disabled
          className="mt-5 min-h-12 w-full rounded-full bg-white font-black text-brand disabled:opacity-60"
        >
          Get started · coming soon
        </button>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted">Quick fix</h2>
        <div className="grid grid-cols-3 gap-3">
          {focusAreas.map((a) => (
            <button
              key={a.label}
              type="button"
              disabled
              className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-card border border-line bg-surface font-bold disabled:opacity-70"
            >
              <span className="text-2xl" aria-hidden>
                {a.emoji}
              </span>
              {a.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
