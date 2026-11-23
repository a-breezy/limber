import { BODY_AREAS, type BodyArea } from '../../domain/types';
import type { Draft } from './draft';

export type StepId =
  | 'welcome'
  | 'areas'
  | `details-${BodyArea}`
  | 'safety'
  | 'see-a-pro'
  | 'conditions'
  | 'lifestyle'
  | 'mobility'
  | 'schedule'
  | 'summary';

/**
 * The step sequence for the current answers. One detail step per chosen area;
 * the "see a professional" step only appears when a red flag is ticked.
 */
export function buildSteps(draft: Draft): StepId[] {
  return [
    'welcome',
    'areas',
    ...draft.areas.map((a) => `details-${a}` as const),
    'safety',
    ...(draft.redFlags.length ? (['see-a-pro'] as const) : []),
    'conditions',
    'lifestyle',
    'mobility',
    'schedule',
    'summary',
  ];
}

export function detailArea(step: string): BodyArea | undefined {
  const m = /^details-(.+)$/.exec(step);
  return m && (BODY_AREAS as readonly string[]).includes(m[1]!) ? (m[1] as BodyArea) : undefined;
}

/** Can the person move on from this step? */
export function canContinue(step: StepId, draft: Draft): boolean {
  switch (step) {
    case 'welcome':
      return draft.disclaimerAccepted;
    case 'lifestyle':
      return draft.work !== undefined && draft.activityLevel !== undefined;
    case 'schedule':
      return draft.daysPerWeek >= 1;
    default:
      return true;
  }
}
