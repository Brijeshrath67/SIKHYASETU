import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { getMeta, pendingEvents } from '../../shared/services/dexie/db';
import { synchronize, type SyncReport } from '../../shared/services/sync/synchronizer';
import { useOnline } from '../../shared/hooks/useOnline';

type SyncContextValue = {
  online: boolean;
  pending: number;
  lastSyncedAt: string | null;
  syncing: boolean;
  report: SyncReport | null;
  error: string | null;
  syncNow: () => Promise<void>;
  refresh: () => Promise<void>;
};

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const online = useOnline();
  const [pending, setPending] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [report, setReport] = useState<SyncReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoRan = useRef(false);

  const refresh = useCallback(async () => {
    const events = await pendingEvents();
    setPending(events.length);
    setLastSyncedAt((await getMeta('last_synced_at')) ?? null);
    setError((await getMeta('sync_error')) || null);
  }, []);

  const syncNow = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await synchronize();
      setReport(result);
      if (result.failed) setError(result.error ?? 'Sync failed');
    } finally {
      await refresh();
      setSyncing(false);
    }
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (online && pending > 0 && !syncing && !autoRan.current) {
      autoRan.current = true;
      void syncNow().finally(() => {
        autoRan.current = false;
      });
    }
  }, [online, pending, syncing, syncNow]);

  const value = useMemo<SyncContextValue>(
    () => ({ online, pending, lastSyncedAt, syncing, report, error, syncNow, refresh }),
    [online, pending, lastSyncedAt, syncing, report, error, syncNow, refresh],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used within a SyncProvider');
  return context;
}
