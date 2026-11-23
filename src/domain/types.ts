/**
 * Core domain types. These are the app's source of truth; the storage
 * layer and (later) the backend serialize these shapes.
 */

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

export interface PainPoint {
  area: BodyArea;
  side?: 'left' | 'right' | 'both';
  intensity: number; // 0–10
  duration: 'acute' | 'chronic'; // < 6 weeks vs longer
  triggers: string[];
}

export interface UserProfile {
  id: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  disclaimerAcceptedAt?: string;
  painPoints: PainPoint[];
  redFlags: string[];
  lifestyle: {
    work: 'desk' | 'standing' | 'active' | 'mixed';
    sittingHours: number;
    activityLevel: 1 | 2 | 3 | 4 | 5;
    sports: string[];
  };
  mobility: Record<string, 'limited' | 'average' | 'good'>;
  schedule: {
    daysPerWeek: number;
    minutesPerSession: SessionLength;
    preferredTime?: string; // "HH:MM"
  };
  equipment: Equipment[];
}

export interface SessionRecord {
  id: string;
  startedAt: string; // ISO
  completedAt?: string; // ISO
  focus: BodyArea[];
  exerciseIds: string[];
  plannedMinutes: number;
}

export interface CheckIn {
  id: string;
  sessionId?: string;
  at: string; // ISO
  area: BodyArea;
  intensity: number; // 0–10
}
