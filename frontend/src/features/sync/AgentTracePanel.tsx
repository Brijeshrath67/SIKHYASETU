import { useEffect, useState } from 'react';

import { apiFetch } from '../../shared/services/api/client';
import { useSync } from './SyncProvider';
import { useOnline } from '../../shared/hooks/useOnline';
import { formatRelative } from '../../shared/utils/format';
import type { AgentTrace } from '../../shared/types/domain';
import { Pill } from '../../shared/components/ui/StatusBadge';

export function AgentTracePanel({ profileId }: { profileId: string }) {
  const online = useOnline();
  const { report } = useSync();
  const [trace, setTrace] = useState<AgentTrace | null>(null);
  const [source, setSource] = useState<'sync' | 'server' | null>(null);

  useEffect(() => {
    const fromSync = report?.runs.find((run) => run.profile_id === profileId) ?? report?.runs[0];
    if (fromSync) {
      setTrace(fromSync);
      setSource('sync');
      return;
    }
    if (!online) {
      setTrace(null);
      return;
    }
    let active = true;
    apiFetch<AgentTrace>(`/api/v1/planning/${profileId}/trace`)
      .then((remote) => {
        if (active) {
          setTrace(remote);
          setSource('server');
        }
      })
      .catch(() => active && setTrace(null));
    return () => {
      active = false;
    };
  }, [online, profileId, report]);

  if (!trace) {
    return (
      <div className="panel panel--empty">
        <span className="lesson-card__badge">REASONING TRACE</span>
        <h2>No Agent Trace Recorded Yet</h2>
        <p className="muted">
          Complete a lesson session and trigger sync, or run the planning agent while online, to inspect the
          deterministic reasoning pipeline graph.
        </p>
      </div>
    );
  }

  return (
    <div className="panel trace-panel">
      <div className="panel__head">
        <div>
          <span className="lesson-card__badge">REASONING TRACE PIPELINE</span>
          <h1>Deterministic Agent Graph</h1>
          <p className="panel__meta">
            Run ID: <code>{trace.run_id.slice(0, 8)}</code> · Trigger: “{trace.trigger}” · Started {formatRelative(trace.started_at)} ·{' '}
            <Pill variant={source === 'server' ? 'ok' : 'offline'}>
              {source === 'server' ? 'Server Verified' : 'Last Synced Run'}
            </Pill>
          </p>
        </div>
      </div>

      <ol className="trace">
        {trace.nodes.map((node, idx) => (
          <li key={node.name} className={`trace__node trace__node--${node.status}`}>
            <div className="trace__head">
              <div className="trace__title-row">
                <span className="trace__step-num">{idx + 1}</span>
                <span className="trace__name">{node.name.replace(/_/g, ' ')}</span>
              </div>
              <span className={`status status--${node.status}`}>{node.status}</span>
            </div>
            <p className="trace__summary">{node.summary}</p>
            {Object.keys(node.details).length > 0 && (
              <pre className="trace__details">{JSON.stringify(node.details, null, 2)}</pre>
            )}
          </li>
        ))}
      </ol>

      <section className="card">
        <h2 className="card__title">Final Agent Decision</h2>
        <pre className="trace__details">{JSON.stringify(trace.decision, null, 2)}</pre>
      </section>
    </div>
  );
}
