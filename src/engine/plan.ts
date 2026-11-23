import { BODY_REGIONS, type BodyArea, type BodyRegion, type UserProfile } from '../domain/types';
import { hashString } from './random';
import { generateRoutine, type Routine } from './routine';

/** Local calendar date as YYYY-MM-DD. */
export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Monday of the week containing `d`. */
export function weekStart(d: Date): Date {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return s;
}

/** Spread n sessions across 7 days (4 → Mon, Tue, Thu, Sat). */
export function sessionDays(n: number): number[] {
  const k = Math.max(0, Math.min(7, Math.round(n)));
  return Array.from({ length: k }, (_, i) => Math.floor((i * 7) / k));
}

/**
 * What to focus on in session #i of the week. Up to three areas: all of them,
 * every time. More than three: the sorest always, the rest rotate in pairs.
 */
export function sessionFocus(profile: UserProfile, i: number): BodyArea[] {
  const areas = [...profile.painPoints]
    .sort((a, b) => b.intensity - a.intensity)
    .map((p) => p.area);
  if (areas.length <= 3) return areas;
  const [top, ...rest] = areas;
  const pairs = Math.ceil(rest.length / 2);
  const start = (i % pairs) * 2;
  return [top!, ...rest.slice(start, start + 2)];
}

export interface PlanDay {
  date: string;
  /** 0 = Monday. */
  weekday: number;
  isSessionDay: boolean;
  /** Index among this week's sessions. */
  sessionIndex?: number;
  focus: BodyArea[];
}

export function planWeek(profile: UserProfile, anyDayInWeek: Date): PlanDay[] {
  const start = weekStart(anyDayInWeek);
  const days = sessionDays(profile.schedule.daysPerWeek);
  return Array.from({ length: 7 }, (_, weekday) => {
    const date = new Date(start);
    date.setDate(start.getDate() + weekday);
    const sessionIndex = days.indexOf(weekday);
    const isSessionDay = sessionIndex !== -1;
    return {
      date: isoDate(date),
      weekday,
      isSessionDay,
      sessionIndex: isSessionDay ? sessionIndex : undefined,
      focus: isSessionDay ? sessionFocus(profile, sessionIndex) : [],
    };
  });
}

/**
 * The routine for a given day. Deterministic (same day → same routine), and
 * varied from the previous session of the week.
 */
export function routineForDay(
  profile: UserProfile,
  date: Date,
): { day: PlanDay; routine: Routine } {
  const week = planWeek(profile, date);
  const day = week.find((d) => d.date === isoDate(date))!;
  // Rest days still get a routine (optional bonus session) using the next focus.
  const focus = day.isSessionDay
    ? day.focus
    : sessionFocus(profile, week.filter((d) => d.isSessionDay && d.weekday < day.weekday).length);

  const previous = week.filter((d) => d.isSessionDay && d.weekday < day.weekday).at(-1);
  const recent = previous
    ? generateRoutine(profile, {
        focus: previous.focus,
        seed: hashString(previous.date),
      }).items.map((i) => i.exerciseId)
    : [];

  return {
    day,
    routine: generateRoutine(profile, { focus, recent, seed: hashString(day.date) }),
  };
}

/** A short routine for one region, right now (e.g. "my back hurts"). */
export function quickFix(profile: UserProfile, region: BodyRegion, date = new Date()): Routine {
  const regionAreas = BODY_REGIONS[region].areas as readonly BodyArea[];
  const sore = profile.painPoints.map((p) => p.area).filter((a) => regionAreas.includes(a));
  return generateRoutine(profile, {
    kind: 'quickFix',
    focus: sore.length ? sore : [...regionAreas],
    seed: hashString(`${isoDate(date)}-${region}`),
  });
}
