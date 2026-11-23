import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Contraindication } from '../../content/contraindications';
import {
  TRIGGERS,
  type MobilityTest,
  type RedFlag,
  type Trigger,
} from '../../domain/profileOptions';
import {
  BODY_AREAS,
  type ActivityLevel,
  type BodyArea,
  type Equipment,
  type MobilityLevel,
  type PainPoint,
  type SessionLength,
  type Side,
  type TimeOfDay,
  type UserProfile,
  type WorkType,
} from '../../domain/types';

export interface AreaDetail {
  side: Side;
  intensity: number;
  duration: 'acute' | 'chronic';
  triggers: Trigger[];
}

/** In-progress onboarding answers. Saved to the device as you go. */
export interface Draft {
  disclaimerAccepted: boolean;
  areas: BodyArea[];
  details: Partial<Record<BodyArea, AreaDetail>>;
  redFlags: RedFlag[];
  conditions: Contraindication[];
  work?: WorkType;
  sittingHours: number;
  activityLevel?: ActivityLevel;
  sports: string[];
  mobility: Partial<Record<MobilityTest, MobilityLevel>>;
  daysPerWeek: number;
  minutesPerSession: SessionLength;
  preferredTime?: TimeOfDay;
  equipment: Equipment[];
  /** Set when editing an existing profile, so createdAt survives. */
  createdAt?: string;
}

export const EMPTY_DRAFT: Draft = {
  disclaimerAccepted: false,
  areas: [],
  details: {},
  redFlags: [],
  conditions: [],
  sittingHours: 6,
  sports: [],
  mobility: {},
  daysPerWeek: 4,
  minutesPerSession: 15,
  equipment: [],
};

export const defaultDetail = (): AreaDetail => ({
  side: 'both',
  intensity: 4,
  duration: 'chronic',
  triggers: [],
});

interface DraftState {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
  toggleArea: (area: BodyArea) => void;
  setDetail: (area: BodyArea, patch: Partial<AreaDetail>) => void;
  load: (draft: Draft) => void;
  reset: () => void;
}

export const useDraft = create<DraftState>()(
  persist(
    (set) => ({
      draft: EMPTY_DRAFT,
      update: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      toggleArea: (area) =>
        set((s) => {
          const has = s.draft.areas.includes(area);
          // Keep areas in canonical order so step order is stable.
          const areas = has
            ? s.draft.areas.filter((a) => a !== area)
            : BODY_AREAS.filter((a) => a === area || s.draft.areas.includes(a));
          const details = { ...s.draft.details };
          if (!has && !details[area]) details[area] = defaultDetail();
          return { draft: { ...s.draft, areas, details } };
        }),
      setDetail: (area, patch) =>
        set((s) => ({
          draft: {
            ...s.draft,
            details: {
              ...s.draft.details,
              [area]: { ...(s.draft.details[area] ?? defaultDetail()), ...patch },
            },
          },
        })),
      load: (draft) => set({ draft }),
      reset: () => set({ draft: EMPTY_DRAFT }),
    }),
    { name: 'limber-onboarding-draft', storage: createJSONStorage(() => localStorage) },
  ),
);

/** Restrictions implied by pain triggers (e.g. low back worse bending forward). */
export function impliedConditions(draft: Draft): Contraindication[] {
  const out = new Set<Contraindication>();
  for (const area of draft.areas) {
    for (const t of draft.details[area]?.triggers ?? []) {
      const implies = (TRIGGERS[t] as { implies?: Partial<Record<BodyArea, Contraindication>> })
        .implies;
      const c = implies?.[area];
      if (c) out.add(c);
    }
  }
  return [...out];
}

export function toProfile(draft: Draft, now = new Date()): UserProfile {
  const iso = now.toISOString();
  const painPoints: PainPoint[] = draft.areas.map((area) => ({
    area,
    ...(draft.details[area] ?? defaultDetail()),
  }));
  return {
    id: 'me',
    createdAt: draft.createdAt ?? iso,
    updatedAt: iso,
    disclaimerAcceptedAt: iso,
    painPoints,
    redFlags: [...draft.redFlags],
    conditions: [...new Set([...draft.conditions, ...impliedConditions(draft)])],
    lifestyle: {
      work: draft.work ?? 'mixed',
      sittingHours: draft.sittingHours,
      activityLevel: draft.activityLevel ?? 3,
      sports: [...draft.sports],
    },
    mobility: { ...draft.mobility },
    schedule: {
      daysPerWeek: draft.daysPerWeek,
      minutesPerSession: draft.minutesPerSession,
      preferredTime: draft.preferredTime,
    },
    equipment: [...draft.equipment],
  };
}

/** Pre-fill onboarding from a saved profile ("Edit my profile"). */
export function draftFromProfile(p: UserProfile): Draft {
  const implied = impliedConditions({
    ...EMPTY_DRAFT,
    areas: p.painPoints.map((pp) => pp.area),
    details: Object.fromEntries(p.painPoints.map(({ area, ...d }) => [area, d])),
  });
  return {
    disclaimerAccepted: true,
    areas: p.painPoints.map((pp) => pp.area),
    details: Object.fromEntries(p.painPoints.map(({ area, ...d }) => [area, d])),
    redFlags: [...p.redFlags],
    // Only the conditions the person ticked; implied ones are re-derived on save.
    conditions: p.conditions.filter((c) => !implied.includes(c)),
    work: p.lifestyle.work,
    sittingHours: p.lifestyle.sittingHours,
    activityLevel: p.lifestyle.activityLevel,
    sports: [...p.lifestyle.sports],
    mobility: { ...p.mobility },
    daysPerWeek: p.schedule.daysPerWeek,
    minutesPerSession: p.schedule.minutesPerSession,
    preferredTime: p.schedule.preferredTime,
    equipment: [...p.equipment],
    createdAt: p.createdAt,
  };
}
