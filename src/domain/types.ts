/**
 * Core domain types. These are the app's source of truth; the storage
 * layer and (later) the backend serialize these shapes.
 */
import type { Contraindication } from '../content/contraindications';
import type { MobilityTest, RedFlag, Trigger } from './profileOptions';

export const BODY_AREAS = [
  'lowBack',
  'quads',
  'hamstrings',
  'hipFlexors',
  'adductors',
  'outerThigh',
  'shoulders',
] as const;
export type BodyArea = (typeof BODY_AREAS)[number];

/** How areas are grouped for people (body map, quick-fix buttons). */
export const BODY_REGIONS = {
  lowBack: { label: 'Low back', areas: ['lowBack'] },
  thighs: {
    label: 'Thighs',
    areas: ['quads', 'hamstrings', 'hipFlexors', 'adductors', 'outerThigh'],
  },
  shoulders: { label: 'Shoulders', areas: ['shoulders'] },
} as const satisfies Record<string, { label: string; areas: readonly BodyArea[] }>;
export type BodyRegion = keyof typeof BODY_REGIONS;

export const AREA_LABELS: Record<BodyArea, string> = {
  lowBack: 'Low back',
  quads: 'Front of thigh (quads)',
  hamstrings: 'Back of thigh (hamstrings)',
  hipFlexors: 'Hip flexors',
  adductors: 'Inner thigh',
  outerThigh: 'Outer thigh / IT band',
  shoulders: 'Shoulders',
};

/**
 * Areas an exercise can work. Superset of pain areas: e.g. glutes or the upper
 * back are often worked *for* low-back or shoulder pain.
 */
export const TARGET_AREAS = [...BODY_AREAS, 'glutes', 'upperBack', 'core', 'chest'] as const;
export type TargetArea = (typeof TARGET_AREAS)[number];

export const TARGET_LABELS: Record<TargetArea, string> = {
  ...AREA_LABELS,
  glutes: 'Glutes',
  upperBack: 'Upper back',
  core: 'Core',
  chest: 'Chest',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  mat: 'Mat',
  blocks: 'Yoga blocks',
  foamRoller: 'Foam roller',
  band: 'Resistance band',
  wall: 'Wall',
};

export const EQUIPMENT = ['mat', 'blocks', 'foamRoller', 'band', 'wall'] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const SESSION_LENGTHS = [10, 15, 20, 25] as const;
export type SessionLength = (typeof SESSION_LENGTHS)[number];

export type Side = 'left' | 'right' | 'both';
export type WorkType = 'desk' | 'standing' | 'active' | 'mixed';
export type ActivityLevel = 1 | 2 | 3 | 4 | 5;
export type MobilityLevel = 'limited' | 'average' | 'good';
export type TimeOfDay = 'morning' | 'midday' | 'evening';

export interface PainPoint {
  area: BodyArea;
  side: Side;
  intensity: number; // 0–10
  duration: 'acute' | 'chronic'; // < 6 weeks vs longer
  triggers: Trigger[];
}

export interface UserProfile {
  id: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  disclaimerAcceptedAt: string;
  painPoints: PainPoint[];
  /** Warning signs that need a professional. Non-empty → breathing-only routines. */
  redFlags: RedFlag[];
  /** Conditions that rule out some exercises (from answers + pain triggers). */
  conditions: Contraindication[];
  lifestyle: {
    work: WorkType;
    sittingHours: number;
    activityLevel: ActivityLevel;
    sports: string[];
  };
  mobility: Partial<Record<MobilityTest, MobilityLevel>>;
  schedule: {
    daysPerWeek: number;
    minutesPerSession: SessionLength;
    preferredTime?: TimeOfDay;
  };
  equipment: Equipment[];
}

export type SessionRating = 'tooEasy' | 'justRight' | 'tooHard';

export interface SessionRecord {
  id: string;
  startedAt: string; // ISO
  completedAt?: string; // ISO
  kind: 'daily' | 'quickFix' | 'breathing';
  focus: BodyArea[];
  /** As planned. */
  exerciseIds: string[];
  /** Exercises with at least one finished set. */
  completedIds: string[];
  skippedIds: string[];
  swaps: { from: string; to: string }[];
  plannedMinutes: number;
  activeSeconds: number;
  rating?: SessionRating;
}

export interface CheckIn {
  id: string;
  sessionId?: string;
  at: string; // ISO
  area: BodyArea;
  intensity: number; // 0–10
}
