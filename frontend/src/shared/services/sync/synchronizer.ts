import { apiFetch } from '../api/client';
import { latestPackForProfile, listProfiles, markEvents, pendingEvents, setMeta, storePack } from '../dexie/db';
import type { AgentTrace, LessonPack, SyncResult } from '../../types/domain';
import type { SyncEvent } from '../../types/events';

export type SyncReport = {
  pushed: number;
  accepted: number;
  duplicates: number;
  profiles: string[];
  packsRefreshed: string[];
  runs: AgentTrace[];
  failed: boolean;
  error?: string;
};

const EMPTY_REPORT: SyncReport = {
  pushed: 0,
  accepted: 0,
  duplicates: 0,
  profiles: [],
  packsRefreshed: [],
  runs: [],
  failed: false,
};

/** Push queued events, then pull fresh packs for every affected learner. */
export async function synchronize(profileId?: string): Promise<SyncReport> {
  const queued = await pendingEvents(profileId);
  if (queued.length === 0) {
    const refreshed = await refreshPacks(profileId ? [profileId] : await allProfileIds());
    return { ...EMPTY_REPORT, packsRefreshed: refreshed };
  }

  const payload = { events: queued.map(stripLocalFields) };
  let result: SyncResult;
  try {
    result = await apiFetch<SyncResult>('/api/v1/events/sync', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync error';
    await setMeta('sync_error', message);
    return { ...EMPTY_REPORT, pushed: queued.length, failed: true, error: message };
  }

  await markEvents(queued.map((event) => event.id), 'sent');
  await setMeta('last_synced_at', new Date().toISOString());
  await setMeta('sync_error', '');

  const affected = result.affected_profiles.length > 0 ? result.affected_profiles : [profileId].filter(Boolean) as string[];
  const packsRefreshed = await refreshPacks(affected);

  return {
    pushed: queued.length,
    accepted: result.accepted,
    duplicates: result.duplicates,
    profiles: affected,
    packsRefreshed,
    runs: result.runs,
    failed: false,
  };
}

async function allProfileIds(): Promise<string[]> {
  return (await listProfiles()).map((profile) => profile.id);
}

async function refreshPacks(profileIds: string[]): Promise<string[]> {
  const refreshed: string[] = [];
  for (const id of profileIds) {
    try {
      const remote = await apiFetch<LessonPack>(`/api/v1/lesson-packs/${id}/next`);
      const local = await latestPackForProfile(id);
      if (!local || local.generated_at < remote.generated_at) {
        await storePack(remote);
      }
      refreshed.push(id);
    } catch {
      // Offline for a specific learner is fine; the cached pack stays in place.
    }
  }
  return refreshed;
}

function stripLocalFields(event: SyncEvent & { _queuedAt?: string; status?: string; attempts?: number }): SyncEvent {
  const { _queuedAt: _q, status: _s, attempts: _a, ...clean } = event;
  return clean;
}
