import { useEffect, useState, type ReactNode } from 'react';

import { ensureSeeded } from '../../shared/services/dexie/db';
import { SyncProvider } from '../../features/sync/SyncProvider';
import { GuruProvider } from '../../features/guru/GuruProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ensureSeeded()
      .then(() => setReady(true))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Failed to open local database'));
  }, []);

  if (error) {
    return <div className="boot boot--error">Local database error: {error}</div>;
  }
  if (!ready) {
    return <div className="boot">Preparing offline lesson store…</div>;
  }
  return (
    <SyncProvider>
      <GuruProvider>{children}</GuruProvider>
    </SyncProvider>
  );
}
