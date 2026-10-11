export type EventType =
  | 'session_started'
  | 'probe_answered'
  | 'intervention_viewed'
  | 'teachback_recorded'
  | 'pack_completed'
  | 'sync_succeeded'
  | 'sync_failed';

export type SyncEvent = {
  id: string;
  profile_id: string;
  type: EventType;
  pack_id?: string | null;
  concept_id?: string | null;
  details: Record<string, unknown>;
  created_at: string;
  /** Local-only bookkeeping; never sent to the server. */
  _queuedAt?: string;
};

export type QueueStatus = {
  pending: number;
  lastSyncedAt?: string | null;
  lastError?: string | null;
};
