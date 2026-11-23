import type { ReactNode } from 'react';
import { Chip, Field, OptionCard, RangeField } from '../../components/ui';
import { CONTRAINDICATIONS, CONTRAINDICATION_IDS } from '../../content/contraindications';
import {
  ACTIVITY_LEVELS,
  MOBILITY_TESTS,
  RED_FLAGS,
  SPORTS,
  TIMES_OF_DAY,
  TRIGGERS,
  WORK_TYPES,
  type MobilityTest,
  type RedFlag,
  type Trigger,
} from '../../domain/profileOptions';
import {
  AREA_LABELS,
  BODY_REGIONS,
  EQUIPMENT,
  EQUIPMENT_LABELS,
  SESSION_LENGTHS,
  type ActivityLevel,
  type BodyArea,
  type MobilityLevel,
  type Side,
  type TimeOfDay,
  type WorkType,
} from '../../domain/types';
import { BodyMap } from './BodyMap';
import { defaultDetail, impliedConditions, useDraft } from './draft';

/** Copy + body for each step. The shell (progress, buttons) lives in OnboardingPage. */
export interface StepContent {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  body: ReactNode;
  nextLabel?: string;
}

const toggle = <T,>(list: readonly T[], item: T): T[] =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

// ---------------------------------------------------------------------------

export function Welcome(): StepContent {
  const { draft, update } = useDraft();
  return {
    eyebrow: 'Welcome to Limber',
    title: "Let's build your routine.",
    subtitle:
      'A few quick questions (about 3 minutes) about what hurts, how you move and how much time you’ve got.',
    nextLabel: "Let's go",
    body: (
      <>
        <ul className="space-y-3 text-sm">
          {[
            ['🎯', 'Routines aimed at exactly where you’re tight or sore'],
            ['🧘', 'Trainer strength, yoga breath and mobility work, blended'],
            ['📱', 'Everything stays on this phone'],
          ].map(([icon, text]) => (
            <li key={text} className="flex gap-3 rounded-2xl bg-surface p-4">
              <span aria-hidden className="text-xl">
                {icon}
              </span>
              <span className="font-bold">{text}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-3 rounded-2xl border-2 border-line p-4 text-sm">
          <p>
            <strong>Limber is not medical advice.</strong> It’s a wellness tool for everyday
            tightness and aches. Stop any movement that causes sharp pain, and see a doctor or
            physical therapist for injuries, numbness or pain that’s getting worse.
          </p>
          <OptionCard
            role="checkbox"
            selected={draft.disclaimerAccepted}
            onClick={() => update({ disclaimerAccepted: !draft.disclaimerAccepted })}
            title="I understand"
          />
        </div>
      </>
    ),
  };
}

export function Areas(): StepContent {
  const { draft, toggleArea } = useDraft();
  return {
    eyebrow: 'Step 1 · Where',
    title: 'What’s bothering you?',
    subtitle: 'Tap the body or pick from the list. Choose as many as you like.',
    nextLabel: draft.areas.length ? 'Next' : 'Nothing hurts, skip',
    body: (
      <>
        <BodyMap selected={draft.areas} onToggle={toggleArea} />
        {Object.values(BODY_REGIONS).map((region) => (
          <Field key={region.label} label={region.label}>
            <div className="flex flex-wrap gap-2">
              {region.areas.map((a) => (
                <Chip key={a} selected={draft.areas.includes(a)} onClick={() => toggleArea(a)}>
                  {AREA_LABELS[a]}
                </Chip>
              ))}
            </div>
          </Field>
        ))}
      </>
    ),
  };
}

const SIDES: Record<Side, string> = { left: 'Left', right: 'Right', both: 'Both / middle' };

export function AreaDetails({ area }: { area: BodyArea }): StepContent {
  const { draft, setDetail } = useDraft();
  const d = draft.details[area] ?? defaultDetail();
  const set = (patch: Partial<typeof d>) => setDetail(area, patch);
  const relevantTriggers = (Object.keys(TRIGGERS) as Trigger[]).filter(
    (t) => area === 'lowBack' || (t !== 'bendingForward' && t !== 'archingBack'),
  );
  return {
    eyebrow: 'Step 1 · Details',
    title: AREA_LABELS[area],
    subtitle: 'Tell us a bit more so we pitch it right.',
    body: (
      <>
        <RangeField
          label="How much does it bother you?"
          value={d.intensity}
          min={0}
          max={10}
          onChange={(intensity) => set({ intensity })}
          format={(v) => `${v}/10`}
          ends={['Barely', 'Worst ever']}
        />
        {d.intensity >= 8 && (
          <p role="alert" className="rounded-2xl bg-brand/10 p-4 text-sm font-bold">
            That’s a lot of pain. We’ll keep things very gentle, and it’s worth getting it checked
            by a professional.
          </p>
        )}
        <Field label="Which side?">
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {(Object.keys(SIDES) as Side[]).map((s) => (
              <Chip key={s} role="radio" selected={d.side === s} onClick={() => set({ side: s })}>
                {SIDES[s]}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="How long has it been going on?">
          <div className="space-y-2" role="radiogroup">
            <OptionCard
              selected={d.duration === 'acute'}
              onClick={() => set({ duration: 'acute' })}
              title="Recently"
              description="Less than 6 weeks"
            />
            <OptionCard
              selected={d.duration === 'chronic'}
              onClick={() => set({ duration: 'chronic' })}
              title="A while"
              description="6 weeks or more, or it keeps coming back"
            />
          </div>
        </Field>
        <Field label="What makes it worse?" hint="Pick any that apply.">
          <div className="flex flex-wrap gap-2">
            {relevantTriggers.map((t) => (
              <Chip
                key={t}
                selected={d.triggers.includes(t)}
                onClick={() => set({ triggers: toggle(d.triggers, t) })}
              >
                {TRIGGERS[t].label}
              </Chip>
            ))}
          </div>
        </Field>
      </>
    ),
  };
}

export function Safety(): StepContent {
  const { draft, update } = useDraft();
  return {
    eyebrow: 'Step 2 · Safety check',
    title: 'Any of these going on?',
    subtitle: 'These can be signs of something that needs a professional, not stretching.',
    nextLabel: draft.redFlags.length ? 'Next' : 'None of these',
    body: (
      <div className="space-y-2">
        {(Object.keys(RED_FLAGS) as RedFlag[]).map((f) => (
          <OptionCard
            key={f}
            role="checkbox"
            selected={draft.redFlags.includes(f)}
            onClick={() => update({ redFlags: toggle(draft.redFlags, f) })}
            title={RED_FLAGS[f]}
          />
        ))}
      </div>
    ),
  };
}

export function SeeAPro(): StepContent {
  const { draft } = useDraft();
  return {
    eyebrow: 'Please read',
    title: 'Check in with a professional first.',
    subtitle:
      'What you ticked can be a sign of a problem that stretching won’t fix and could make worse.',
    nextLabel: 'I understand, continue',
    body: (
      <>
        <ul className="list-disc space-y-1 rounded-2xl bg-surface p-4 pl-8 text-sm">
          {draft.redFlags.map((f) => (
            <li key={f}>{RED_FLAGS[f]}</li>
          ))}
        </ul>
        <div className="space-y-2 rounded-2xl border-2 border-brand p-4 text-sm">
          <p className="font-bold">
            If symptoms are sudden or severe, such as losing bladder or bowel control, or chest
            pain, get urgent medical care now.
          </p>
          <p>
            Otherwise, book a visit with a doctor or physical therapist. Until you’ve been checked,
            Limber will only suggest gentle breathing sessions. You can update this any time from
            Settings.
          </p>
        </div>
      </>
    ),
  };
}

export function Conditions(): StepContent {
  const { draft, update } = useDraft();
  const implied = impliedConditions(draft);
  return {
    eyebrow: 'Step 2 · Safety check',
    title: 'Anything we should work around?',
    subtitle: 'We’ll skip or swap exercises that don’t suit these.',
    nextLabel: draft.conditions.length || implied.length ? 'Next' : 'None of these',
    body: (
      <div className="space-y-2">
        {CONTRAINDICATION_IDS.map((c) => {
          const auto = implied.includes(c);
          return (
            <OptionCard
              key={c}
              role="checkbox"
              selected={auto || draft.conditions.includes(c)}
              onClick={() => !auto && update({ conditions: toggle(draft.conditions, c) })}
              title={CONTRAINDICATIONS[c].label}
              description={auto ? 'Added from your pain answers' : undefined}
            />
          );
        })}
      </div>
    ),
  };
}

export function Lifestyle(): StepContent {
  const { draft, update } = useDraft();
  return {
    eyebrow: 'Step 3 · Your day',
    title: 'How do you move day to day?',
    body: (
      <>
        <Field label="Your day is mostly…">
          <div className="space-y-2" role="radiogroup">
            {(Object.keys(WORK_TYPES) as WorkType[]).map((w) => (
              <OptionCard
                key={w}
                selected={draft.work === w}
                onClick={() => update({ work: w })}
                title={WORK_TYPES[w]}
              />
            ))}
          </div>
        </Field>
        <RangeField
          label="Hours sitting per day"
          value={draft.sittingHours}
          min={0}
          max={14}
          onChange={(sittingHours) => update({ sittingHours })}
          format={(v) => (v >= 14 ? '14+ h' : `${v} h`)}
        />
        <Field label="How active are you?">
          <div className="space-y-2" role="radiogroup">
            {([1, 2, 3, 4, 5] as ActivityLevel[]).map((l) => (
              <OptionCard
                key={l}
                selected={draft.activityLevel === l}
                onClick={() => update({ activityLevel: l })}
                title={ACTIVITY_LEVELS[l]}
              />
            ))}
          </div>
        </Field>
        <Field label="Sports or training" hint="Optional. We’ll favour areas they load.">
          <div className="flex flex-wrap gap-2">
            {SPORTS.map((s) => (
              <Chip
                key={s}
                selected={draft.sports.includes(s)}
                onClick={() => update({ sports: toggle(draft.sports, s) })}
              >
                {s}
              </Chip>
            ))}
          </div>
        </Field>
      </>
    ),
  };
}

const LEVEL_ORDER: MobilityLevel[] = ['limited', 'average', 'good'];

export function Mobility(): StepContent {
  const { draft, update } = useDraft();
  const answered = Object.keys(draft.mobility).length;
  return {
    eyebrow: 'Step 4 · Quick check',
    title: 'Test your mobility.',
    subtitle:
      'Try each one gently, without warming up, and pick what happened. Skip any that hurt.',
    nextLabel: answered ? 'Next' : 'Skip for now',
    body: (
      <>
        {(Object.keys(MOBILITY_TESTS) as MobilityTest[]).map((t) => {
          const test = MOBILITY_TESTS[t];
          return (
            <section key={t} className="space-y-3 rounded-2xl bg-surface p-4">
              <div>
                <h2 className="font-display text-xl font-black">{test.name}</h2>
                <p className="text-xs font-bold uppercase tracking-widest text-muted">
                  {test.checks}
                </p>
                <p className="mt-2 text-sm">{test.howTo}</p>
              </div>
              <div className="space-y-2" role="radiogroup" aria-label={test.name}>
                {LEVEL_ORDER.map((level) => (
                  <OptionCard
                    key={level}
                    selected={draft.mobility[t] === level}
                    onClick={() => {
                      const mobility = { ...draft.mobility };
                      if (mobility[t] === level) delete mobility[t];
                      else mobility[t] = level;
                      update({ mobility });
                    }}
                    title={test.levels[level]}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </>
    ),
  };
}

export function Schedule(): StepContent {
  const { draft, update } = useDraft();
  return {
    eyebrow: 'Step 5 · Your plan',
    title: 'How much time have you got?',
    body: (
      <>
        <Field label="Days per week">
          <div className="grid grid-cols-7 gap-1.5" role="radiogroup">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={draft.daysPerWeek === n}
                aria-label={`${n} days`}
                onClick={() => update({ daysPerWeek: n })}
                className={`aspect-square rounded-xl font-display text-lg font-black ${
                  draft.daysPerWeek === n ? 'bg-brand text-brand-ink' : 'border border-line'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Minutes per session">
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {SESSION_LENGTHS.map((m) => (
              <Chip
                key={m}
                role="radio"
                selected={draft.minutesPerSession === m}
                onClick={() => update({ minutesPerSession: m })}
              >
                {m} min
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Best time of day" hint="Optional. We’ll use it for reminders later.">
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {(Object.keys(TIMES_OF_DAY) as TimeOfDay[]).map((t) => (
              <Chip
                key={t}
                role="radio"
                selected={draft.preferredTime === t}
                onClick={() => update({ preferredTime: draft.preferredTime === t ? undefined : t })}
              >
                {TIMES_OF_DAY[t]}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Equipment you have" hint="No gear? No problem. Bodyweight works.">
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT.map((e) => (
              <Chip
                key={e}
                selected={draft.equipment.includes(e)}
                onClick={() => update({ equipment: toggle(draft.equipment, e) })}
              >
                {EQUIPMENT_LABELS[e]}
              </Chip>
            ))}
          </div>
        </Field>
      </>
    ),
  };
}

export function Summary({ onEdit }: { onEdit: (step: string) => void }): StepContent {
  const { draft } = useDraft();
  const conditions = [...new Set([...draft.conditions, ...impliedConditions(draft)])];
  const rows: { label: string; value: ReactNode; step: string }[] = [
    {
      label: 'Focus areas',
      value: draft.areas.length
        ? draft.areas
            .map((a) => `${AREA_LABELS[a]} (${draft.details[a]?.intensity ?? 0}/10)`)
            .join(', ')
        : 'General mobility',
      step: 'areas',
    },
    {
      label: 'Safety',
      value: draft.redFlags.length
        ? 'See a professional first; breathing sessions only'
        : conditions.length
          ? `Working around: ${conditions.map((c) => CONTRAINDICATIONS[c].label.toLowerCase()).join('; ')}`
          : 'All clear',
      step: 'safety',
    },
    {
      label: 'Your day',
      value: `${draft.work ? WORK_TYPES[draft.work] : '—'} · ${draft.sittingHours} h sitting`,
      step: 'lifestyle',
    },
    {
      label: 'Mobility',
      value: Object.keys(draft.mobility).length
        ? (Object.entries(draft.mobility) as [MobilityTest, MobilityLevel][])
            .map(([t, l]) => `${MOBILITY_TESTS[t].name}: ${l}`)
            .join(', ')
        : 'Not tested yet',
      step: 'mobility',
    },
    {
      label: 'Plan',
      value: `${draft.daysPerWeek}× a week, ${draft.minutesPerSession} min${
        draft.preferredTime ? `, ${TIMES_OF_DAY[draft.preferredTime].toLowerCase()}` : ''
      }`,
      step: 'schedule',
    },
    {
      label: 'Equipment',
      value: draft.equipment.length
        ? draft.equipment.map((e) => EQUIPMENT_LABELS[e]).join(', ')
        : 'Bodyweight only',
      step: 'schedule',
    },
  ];
  return {
    eyebrow: 'All set',
    title: "Here's what we heard.",
    subtitle: 'Check it over. Tap any row to change it.',
    nextLabel: 'Save my profile',
    body: (
      <dl className="divide-y divide-line overflow-hidden rounded-2xl bg-surface">
        {rows.map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => onEdit(r.step)}
            className="block w-full px-4 py-3 text-left"
          >
            <dt className="text-xs font-bold uppercase tracking-widest text-muted">{r.label}</dt>
            <dd className="mt-0.5 font-bold">{r.value}</dd>
          </button>
        ))}
      </dl>
    ),
  };
}
