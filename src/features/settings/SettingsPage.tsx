import { useState } from 'react';
import { Link } from 'react-router';
import { useProfileStore } from '../../app/useProfileStore';
import { store } from '../../storage';

export function SettingsPage() {
  const reset = useProfileStore((s) => s.reset);
  const [message, setMessage] = useState<string>();

  async function exportData() {
    const data = await store.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `limber-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteData() {
    if (!window.confirm('Delete all Limber data on this device? This cannot be undone.')) return;
    await reset();
    setMessage('All data deleted.');
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-black">Settings</h1>

      <section className="space-y-3 rounded-card border border-line bg-surface p-5">
        <h2 className="font-bold">Your data</h2>
        <p className="text-sm text-muted">Everything is stored only on this device.</p>
        <button
          type="button"
          onClick={exportData}
          className="min-h-12 w-full rounded-full border-2 border-ink font-bold"
        >
          Export my data
        </button>
        <button
          type="button"
          onClick={deleteData}
          className="min-h-12 w-full rounded-full bg-red-600 font-bold text-white"
        >
          Delete my data
        </button>
        {message && (
          <p role="status" className="text-sm font-bold">
            {message}
          </p>
        )}
      </section>

      <Link
        to="/dev/poses"
        className="flex min-h-12 items-center justify-between rounded-card border border-line bg-surface px-5 font-bold"
      >
        Pose gallery (dev) <span aria-hidden>→</span>
      </Link>

      <p className="text-xs text-muted">
        Limber is a wellness tool, not medical advice. Stop any movement that causes sharp pain and
        see a professional for injuries or persistent pain.
      </p>
    </div>
  );
}
