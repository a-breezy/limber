import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '../../app/routes';
import { useProfileStore } from '../../app/useProfileStore';
import type { UserProfile } from '../../domain/types';
import { store } from '../../storage';

const me: UserProfile = {
  id: 'me',
  createdAt: '',
  updatedAt: '',
  disclaimerAcceptedAt: '',
  painPoints: [
    { area: 'shoulders', side: 'both', intensity: 5, duration: 'chronic', triggers: [] },
  ],
  redFlags: [],
  conditions: [],
  lifestyle: { work: 'desk', sittingHours: 8, activityLevel: 3, sports: [] },
  mobility: {},
  schedule: { daysPerWeek: 4, minutesPerSession: 10 },
  equipment: ['mat', 'band', 'wall'],
};

describe('guided session', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance', 'Date'] });
    await store.clearAll();
    await store.saveProfile(me);
    await act(() => useProfileStore.getState().load());
  });
  afterEach(() => vi.useRealTimers());

  it('plays a quick fix start to finish and saves the session with a check-in', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/session/quick/shoulders'] });
    render(<RouterProvider router={router} />);

    fireEvent.click(screen.getByRole('button', { name: "Let's go" }));
    expect(screen.getByText(/up next/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /start now/i }));
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();

    // Pause stops the clock.
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Paused');
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));

    // Let the whole session play out.
    await act(async () => {
      vi.advanceTimersByTime(10 * 60 * 1000);
    });
    expect(screen.getByText(/nailed it/i)).toBeInTheDocument();

    fireEvent.change(screen.getByRole('slider'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Just right' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });
    vi.useRealTimers();
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/'));

    const [session] = await store.listSessions();
    expect(session?.kind).toBe('quickFix');
    expect(session?.completedIds.length).toBe(session?.exerciseIds.length);
    expect(session?.rating).toBe('justRight');
    const checkIns = await store.listCheckIns();
    expect(checkIns).toMatchObject([{ area: 'shoulders', intensity: 2, sessionId: session?.id }]);
  });
});
