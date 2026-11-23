import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '../../app/routes';
import { useProfileStore } from '../../app/useProfileStore';
import { store } from '../../storage';
import {
  draftFromProfile,
  EMPTY_DRAFT,
  impliedConditions,
  toProfile,
  useDraft,
  type Draft,
} from './draft';
import { buildSteps, canContinue } from './steps';

const sample: Draft = {
  ...EMPTY_DRAFT,
  disclaimerAccepted: true,
  areas: ['lowBack', 'hamstrings'],
  details: {
    lowBack: {
      side: 'both',
      intensity: 6,
      duration: 'chronic',
      triggers: ['sitting', 'bendingForward'],
    },
    hamstrings: { side: 'left', intensity: 3, duration: 'acute', triggers: ['bendingForward'] },
  },
  conditions: ['wristPain'],
  work: 'desk',
  activityLevel: 2,
  sports: ['Running'],
  mobility: { toeTouch: 'limited' },
  daysPerWeek: 5,
  minutesPerSession: 20,
  preferredTime: 'morning',
  equipment: ['mat', 'band'],
};

describe('profile mapping', () => {
  it('derives restrictions from pain triggers, only for the matching area', () => {
    // "bending forward" on the low back implies flexion sensitivity; on hamstrings it doesn't.
    expect(impliedConditions(sample)).toEqual(['flexionSensitiveBack']);
    const p = toProfile(sample, new Date('2026-11-23T08:00:00Z'));
    expect(p.conditions.sort()).toEqual(['flexionSensitiveBack', 'wristPain']);
    expect(p.painPoints.map((x) => x.area)).toEqual(['lowBack', 'hamstrings']);
    expect(p.schedule).toEqual({ daysPerWeek: 5, minutesPerSession: 20, preferredTime: 'morning' });
  });

  it('round-trips through edit without losing answers or duplicating restrictions', () => {
    const p = toProfile(sample, new Date('2026-11-23T08:00:00Z'));
    const d = draftFromProfile(p);
    expect(d.conditions).toEqual(['wristPain']); // implied one re-derived, not stored twice
    const again = toProfile(d, new Date('2026-11-24T08:00:00Z'));
    expect(again.createdAt).toBe(p.createdAt);
    expect({ ...again, updatedAt: '', disclaimerAcceptedAt: '' }).toEqual({
      ...p,
      updatedAt: '',
      disclaimerAcceptedAt: '',
    });
  });
});

describe('step sequence', () => {
  it('adds a details step per area and a stop step only with red flags', () => {
    expect(buildSteps(sample)).toEqual([
      'welcome',
      'areas',
      'details-lowBack',
      'details-hamstrings',
      'safety',
      'conditions',
      'lifestyle',
      'mobility',
      'schedule',
      'summary',
    ]);
    expect(buildSteps({ ...sample, redFlags: ['trauma'] })).toContain('see-a-pro');
  });

  it('gates the disclaimer and required lifestyle answers', () => {
    expect(canContinue('welcome', EMPTY_DRAFT)).toBe(false);
    expect(canContinue('lifestyle', EMPTY_DRAFT)).toBe(false);
    expect(canContinue('lifestyle', sample)).toBe(true);
  });
});

describe('onboarding flow', () => {
  beforeEach(async () => {
    localStorage.clear();
    useDraft.getState().reset();
    await store.clearAll();
    await act(() => useProfileStore.getState().load());
  });

  const next = (name: RegExp | string = /^next$/i) =>
    fireEvent.click(screen.getByRole('button', { name }));

  it('walks every step and saves a profile', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/onboarding/welcome'] });
    render(<RouterProvider router={router} />);

    // Welcome: can't continue until the disclaimer is accepted.
    expect(screen.getByRole('button', { name: "Let's go" })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'I understand' }));
    next("Let's go");

    // Areas: pick from the chip list.
    fireEvent.click(screen.getByRole('checkbox', { name: 'Low back' }));
    next();

    // Details for low back.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Low back');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Bending forward' }));
    next();

    // Safety: none.
    next('None of these');
    // Conditions: implied restriction is pre-ticked.
    expect(
      screen.getByRole('checkbox', { name: /bending forward.*added from your pain answers/i }),
    ).toHaveAttribute('aria-checked', 'true');
    next();

    // Lifestyle requires work + activity.
    expect(screen.getByRole('button', { name: /^next$/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: /mostly sitting/i }));
    fireEvent.click(screen.getByRole('radio', { name: /moderate/i }));
    next();

    // Mobility: skip.
    next('Skip for now');

    // Schedule.
    fireEvent.click(screen.getByRole('radio', { name: '20 min' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Foam roller' }));
    next();

    // Summary → save.
    expect(screen.getByText(/here's what we heard/i)).toBeInTheDocument();
    next('Save my profile');

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    const saved = await store.getProfile();
    expect(saved?.painPoints[0]?.area).toBe('lowBack');
    expect(saved?.conditions).toContain('flexionSensitiveBack');
    expect(saved?.schedule.minutesPerSession).toBe(20);
    expect(saved?.equipment).toEqual(['foamRoller']);
    expect(useDraft.getState().draft).toEqual(EMPTY_DRAFT);
  });

  it('routes red flags to the see-a-professional step', () => {
    useDraft.getState().load({ ...sample, redFlags: [] });
    const router = createMemoryRouter(routes, { initialEntries: ['/onboarding/safety'] });
    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /bladder or bowels/i }));
    next();
    expect(router.state.location.pathname).toBe('/onboarding/see-a-pro');
    expect(screen.getByText(/get urgent medical care now/i)).toBeInTheDocument();
  });

  it('deep links bounce to the first unanswered required step', () => {
    useDraft.getState().load({ ...sample, work: undefined });
    const router = createMemoryRouter(routes, { initialEntries: ['/onboarding/summary'] });
    render(<RouterProvider router={router} />);
    expect(router.state.location.pathname).toBe('/onboarding/lifestyle');
  });

  it('sends people back to the start if they skip the disclaimer', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/onboarding/schedule'] });
    render(<RouterProvider router={router} />);
    expect(router.state.location.pathname).toBe('/onboarding/welcome');
  });
});
