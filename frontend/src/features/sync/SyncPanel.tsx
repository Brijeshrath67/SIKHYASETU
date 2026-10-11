import { useEffect, useState } from 'react';

import { db, pendingEvents, type QueuedEvent } from '../../shared/services/dexie/db';
import { useSync } from './SyncProvider';
import { formatRelative } from '../../shared/utils/format';
import { Pill, StatusDot } from '../../shared/components/ui/StatusBadge';
import { StatTile } from '../../shared/components/ui/StatTile';

export function SyncPanel() {
  const { pending, lastSyncedAt, syncing, report, error, online, syncNow } = useSync();
  const [queued, setQueued] = useState<QueuedEvent[]>([]);
  const [sent, setSent] = useState<number>(0);

  useEffect(() => {
    let active = true;
    void pendingEvents().then((events) => {
      if (active) setQueued(events);
    });
    void db.events.where('status').equals('sent').count().then((count) => {
      if (active) setSent(count);
    });
    return () => {
      active = false;
    };
  }, [pending, report]);

  return (
    <div className="panel sync-panel">
      <div className="panel__head">
        <div>
          <span className="lesson-card__badge">DEVICE SYNCHRONIZATION</span>
          <h1>Sync & Data Budget</h1>
          <p className="panel__meta">
            <StatusDot online={online} /> {online ? 'Connected to School Server' : 'Offline — Events safely stored on device'} · Last sync {formatRelative(lastSyncedAt)}
          </p>
        </div>
        <button
          type="button"
          className="primary-btn"
          onClick={() => void syncNow()}
          disabled={syncing}
        >
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {error && <div className="banner banner--warn">Last Sync Notice: {error}</div>}
      {report && !report.failed && (
        <div className="banner banner--ok">
          ✓ Pushed {report.pushed} events · Accepted {report.accepted} · Refreshed {report.packsRefreshed.length} lesson packs
        </div>
      )}

      <div className="dash-stats">
        <StatTile
          value={String(pending)}
          label="Pending Queue"
          sub="Stored offline in Dexie"
          tone={pending > 0 ? 'warn' : 'ok'}
        />
        <StatTile
          value={String(sent)}
          label="Synchronized Events"
          sub="Verified by school server"
          tone="ok"
        />
        <StatTile
          value={online ? 'Online' : 'Offline'}
          label="Network Interface"
          sub="Auto-reconnects on ping"
          tone={online ? 'ok' : 'slate'}
        />
      </div>

      <section className="card">
        <div className="lesson-card__header">
          <div>
            <h2 className="card__title">Locally Queued Events</h2>
            <p className="card__subtitle">Idempotent client-generated events awaiting push</p>
          </div>
          <Pill variant="queue">{queued.length} items</Pill>
        </div>

        {queued.length === 0 ? (
          <p className="muted">All events are synchronized. No pending queue items on this device.</p>
        ) : (
          <table className="summary__table">
            <thead>
              <tr>
                <th>Event Type</th>
                <th>Concept Target</th>
                <th>Recorded At</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {queued.map((event) => (
                <tr key={event.id}>
                  <td>
                    <strong>{event.type.replace(/_/g, ' ')}</strong>
                  </td>
                  <td>{event.concept_id ?? '—'}</td>
                  <td>{formatRelative(event.created_at)}</td>
                  <td>
                    <Pill variant="warn">pending</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2 className="card__title">Privacy & Local Storage Architecture</h2>
        <p className="card__explanation">
          Only minimal structured events (diagnostic probe outcomes, teach-back text responses, and rubric scores)
          are ever synchronized. Raw audio recordings remain strictly on this device and are never automatically
          transmitted without explicit learner consent.
        </p>
      </section>
    </div>
  );
}
