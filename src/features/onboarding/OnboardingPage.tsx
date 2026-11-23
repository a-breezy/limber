import { useEffect, useState, type ComponentType } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { useProfileStore } from '../../app/useProfileStore';
import { useDraft, toProfile } from './draft';
import { StepShell } from './StepShell';
import { buildSteps, canContinue, detailArea, type StepId } from './steps';
import {
  AreaDetails,
  Areas,
  Conditions,
  Lifestyle,
  Mobility,
  Safety,
  Schedule,
  SeeAPro,
  Summary,
  Welcome,
  type StepContent,
} from './stepScreens';

interface ShellProps {
  index: number;
  total: number;
  onBack?: () => void;
  onNext: () => void;
  nextDisabled: boolean;
}

/** Wraps a content function into a component that renders inside the step shell. */
function asStep<P extends object>(content: (p: P) => StepContent) {
  const Step = ({ shell, ...props }: P & { shell: ShellProps }) => {
    const c = content(props as unknown as P);
    return (
      <StepShell
        {...shell}
        eyebrow={c.eyebrow}
        title={c.title}
        subtitle={c.subtitle}
        nextLabel={c.nextLabel}
      >
        {c.body}
      </StepShell>
    );
  };
  return Step as ComponentType<P & { shell: ShellProps }>;
}

const WelcomeStep = asStep(Welcome);
const AreasStep = asStep(Areas);
const DetailsStep = asStep(AreaDetails);
const SafetyStep = asStep(Safety);
const SeeAProStep = asStep(SeeAPro);
const ConditionsStep = asStep(Conditions);
const LifestyleStep = asStep(Lifestyle);
const MobilityStep = asStep(Mobility);
const ScheduleStep = asStep(Schedule);
const SummaryStep = asStep(Summary);

export function OnboardingPage() {
  const { step = 'welcome' } = useParams();
  const navigate = useNavigate();
  const draft = useDraft((s) => s.draft);
  const resetDraft = useDraft((s) => s.reset);
  const saveProfile = useProfileStore((s) => s.save);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const steps = buildSteps(draft);
  const index = steps.indexOf(step as StepId);
  // While saving, the draft is cleared just before we leave; don't bounce anywhere.
  if (!saving) {
    if (index === -1) return <Navigate to="/onboarding/welcome" replace />;
    // Deep links can't skip required answers (disclaimer, lifestyle…).
    const blocked = steps.slice(0, index).find((s) => !canContinue(s, draft));
    if (blocked) return <Navigate to={`/onboarding/${blocked}`} replace />;
  }

  const id = step as StepId;
  const go = (s: string) => navigate(`/onboarding/${s}`);

  async function next() {
    if (id === 'summary') {
      setSaving(true);
      await saveProfile(toProfile(draft));
      resetDraft();
      navigate('/', { replace: true });
      return;
    }
    const nextStep = buildSteps(useDraft.getState().draft)[index + 1];
    if (nextStep) go(nextStep);
  }

  const shell: ShellProps = {
    index,
    total: steps.length,
    onBack: index > 0 ? () => go(steps[index - 1]!) : undefined,
    onNext: () => void next(),
    nextDisabled: saving || !canContinue(id, draft),
  };

  const area = detailArea(id);
  if (area) return <DetailsStep key={id} shell={shell} area={area} />;

  switch (id) {
    case 'welcome':
      return <WelcomeStep shell={shell} />;
    case 'areas':
      return <AreasStep shell={shell} />;
    case 'safety':
      return <SafetyStep shell={shell} />;
    case 'see-a-pro':
      return <SeeAProStep shell={shell} />;
    case 'conditions':
      return <ConditionsStep shell={shell} />;
    case 'lifestyle':
      return <LifestyleStep shell={shell} />;
    case 'mobility':
      return <MobilityStep shell={shell} />;
    case 'schedule':
      return <ScheduleStep shell={shell} />;
    case 'summary':
      return <SummaryStep shell={shell} onEdit={go} />;
    default:
      return <Navigate to="/onboarding/welcome" replace />;
  }
}
