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
