import type { RouteObject } from 'react-router';
import { AppLayout } from './AppLayout';
import { TodayPage } from '../features/today/TodayPage';
import { ProgressPage } from '../features/progress/ProgressPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { PoseGallery } from '../features/dev/PoseGallery';
import { ExerciseLibrary } from '../features/dev/ExerciseLibrary';
import { OnboardingPage } from '../features/onboarding/OnboardingPage';
import { QuickFixPage } from '../features/routine/QuickFixPage';
import { SessionPage } from '../features/session/SessionPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'progress', element: <ProgressPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'quick/:region', element: <QuickFixPage /> },
      { path: 'dev/poses', element: <PoseGallery /> },
      { path: 'dev/exercises', element: <ExerciseLibrary /> },
    ],
  },
  // Full-screen flow, no bottom nav.
  { path: '/onboarding/:step?', element: <OnboardingPage /> },
  { path: '/session/today', element: <SessionPage /> },
  { path: '/session/quick/:region', element: <SessionPage /> },
];
