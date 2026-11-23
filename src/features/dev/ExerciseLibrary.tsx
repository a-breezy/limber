import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { CLIPS } from '../../animation/clips';
import { Mannequin } from '../../animation/Mannequin';
import { CONTRAINDICATIONS } from '../../content/contraindications';
import { REFERENCES } from '../../content/references';
import { describeDosage, estimateSeconds, EXERCISES, type Exercise } from '../../content';
import { BODY_REGIONS, EQUIPMENT_LABELS, TARGET_LABELS, type BodyRegion } from '../../domain/types';

const PHASE_LABEL: Record<Exercise['phase'], string> = {
  warmup: 'Warm-up',
  mobilize: 'Mobilize',
  release: 'Release',
  stretch: 'Stretch',
  activate: 'Activate',
  breathe: 'Breathe',
};

/** Dev page: browse and review the exercise library content. */
export function ExerciseLibrary() {
  const [region, setRegion] = useState<BodyRegion | 'all'>('all');

  const list = useMemo(() => {
    if (region === 'all') return EXERCISES;
    const areas = BODY_REGIONS[region].areas as readonly string[];
    return EXERCISES.filter((e) => e.targets.some((t) => areas.includes(t.area)));
  }, [region]);

  const animated = EXERCISES.filter((e) => e.animationId).length;

  return (
    <div className="space-y-5">
      <header>
        <Link to="/settings" className="text-sm font-bold text-brand">
          ← Settings
        </Link>
        <h1 className="mt-2 font-display text-3xl font-black">Exercise library</h1>
        <p className="mt-1 text-sm text-muted">
          {EXERCISES.length} exercises · {animated} animated · all self-reviewed (no expert review
          yet)
        </p>
      </header>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by region">
        {(['all', ...Object.keys(BODY_REGIONS)] as const).map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={region === r}
            onClick={() => setRegion(r as BodyRegion | 'all')}
            className={`min-h-10 rounded-full px-4 text-sm font-bold ${
              region === r ? 'bg-ink text-bg' : 'border border-line'
            }`}
          >
            {r === 'all' ? 'All' : BODY_REGIONS[r as BodyRegion].label}
          </button>
        ))}
      </div>

      <ul className="space-y-3">
        {list.map((e) => (
          <ExerciseCard key={e.id} exercise={e} />
        ))}
      </ul>
    </div>
  );
}

function ExerciseCard({ exercise: e }: { exercise: Exercise }) {
  const [open, setOpen] = useState(false);
  const clip = e.animationId ? CLIPS[e.animationId] : undefined;
  const minutes = Math.max(1, Math.round(estimateSeconds(e) / 60));

  return (
    <li className="overflow-hidden rounded-card border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-lg font-black leading-tight">{e.name}</h2>
          <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-brand-ink">
            {PHASE_LABEL[e.phase]}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">{e.summary}</p>
        <p className="mt-2 text-xs font-bold">
          {describeDosage(e.dosage)} · ~{minutes} min · level {e.difficulty}
          {clip ? ' · ▶ animated' : ''}
        </p>
      </button>

      {open && (
        <div className="space-y-4 border-t border-line p-4 text-sm">
          {clip && <Mannequin clip={clip} className="aspect-square w-full" />}
          <Section title="Targets">
            {e.targets
              .map((t) => `${TARGET_LABELS[t.area]}${t.role === 'secondary' ? ' (secondary)' : ''}`)
              .join(', ')}
          </Section>
          <Section title="Equipment">
            {[
              ...e.equipment.map((x) => EQUIPMENT_LABELS[x]),
              ...e.optionalEquipment.map((x) => `${EQUIPMENT_LABELS[x]} (optional)`),
            ].join(', ') || 'None'}
          </Section>
          <Section title="How to">
            <ol className="list-decimal space-y-1 pl-5">
              {e.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </Section>
          <Section title="Cues">
            <ul className="list-disc space-y-1 pl-5">
              {e.cues.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </Section>
          <Section title="Common mistakes">
            <ul className="list-disc space-y-1 pl-5">
              {e.mistakes.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </Section>
          <Section title="Breath">{e.breath}</Section>
          {e.contraindications.length > 0 && (
            <Section title="Skip or modify if">
              <ul className="list-disc space-y-1 pl-5">
                {e.contraindications.map((c) => (
                  <li key={c}>{CONTRAINDICATIONS[c].label}</li>
                ))}
              </ul>
            </Section>
          )}
          <Section title="Sources">
            <ul className="space-y-1 text-xs text-muted">
              {e.sources.map((s) => (
                <li key={s}>{REFERENCES[s].citation}</li>
              ))}
            </ul>
          </Section>
        </div>
      )}
    </li>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-bold uppercase tracking-widest text-muted">{title}</h3>
      <div>{children}</div>
    </div>
  );
}
