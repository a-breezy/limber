import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { routes } from './routes';
import { useProfileStore } from './useProfileStore';

const router = createBrowserRouter(routes);

export function App() {
  const load = useProfileStore((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  return <RouterProvider router={router} />;
}
