import type { RouteObject } from 'react-router';
import { AppLayout } from './AppLayout';
import { TodayPage } from '../features/today/TodayPage';
import { ProgressPage } from '../features/progress/ProgressPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { PoseGallery } from '../features/dev/PoseGallery';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'progress', element: <ProgressPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'dev/poses', element: <PoseGallery /> },
    ],
  },
];
