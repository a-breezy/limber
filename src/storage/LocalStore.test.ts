import { describe, expect, it } from 'vitest';
import { LocalStore } from './LocalStore';
import type { UserProfile } from '../domain/types';

const profile: UserProfile = {
  id: 'me',
  createdAt: '2026-11-23T00:00:00.000Z',
  updatedAt: '2026-11-23T00:00:00.000Z',
  painPoints: [
    { area: 'lowBack', side: 'both', intensity: 5, duration: 'chronic', triggers: ['sitting'] },
  ],
  disclaimerAcceptedAt: '2026-11-23T00:00:00.000Z',
  redFlags: [],
  conditions: [],
  lifestyle: { work: 'desk', sittingHours: 8, activityLevel: 3, sports: [] },
  mobility: {},
  schedule: { daysPerWeek: 4, minutesPerSession: 15 },
  equipment: ['mat', 'blocks', 'foamRoller', 'band'],
};

describe('LocalStore', () => {
  it('saves and reads back a profile', async () => {
    const s = new LocalStore(`test-${crypto.randomUUID()}`);
    expect(await s.getProfile()).toBeUndefined();
    await s.saveProfile(profile);
    expect(await s.getProfile()).toEqual(profile);
  });

  it('lists sessions newest first and clears everything', async () => {
    const s = new LocalStore(`test-${crypto.randomUUID()}`);
    await s.saveSession({
      id: 'a',
      startedAt: '2026-11-01T00:00:00Z',
      focus: ['lowBack'],
      exerciseIds: [],
      plannedMinutes: 10,
    });
    await s.saveSession({
      id: 'b',
      startedAt: '2026-11-02T00:00:00Z',
      focus: ['quads'],
      exerciseIds: [],
      plannedMinutes: 20,
    });
    expect((await s.listSessions()).map((x) => x.id)).toEqual(['b', 'a']);
    await s.saveProfile(profile);
    await s.clearAll();
    expect(await s.exportAll()).toEqual({ profile: undefined, sessions: [], checkIns: [] });
  });
});
