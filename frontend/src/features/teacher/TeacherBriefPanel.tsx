import { useEffect, useState } from 'react';

import { apiFetch } from '../../shared/services/api/client';
import { useOnline } from '../../shared/hooks/useOnline';
import { formatRelative } from '../../shared/utils/format';
import { buildLocalBrief } from './localBrief';
import type { TeacherActionBrief } from '../../shared/types/domain';

export function TeacherBriefPanel() {
  const online = useOnline();
  const [brief, setBrief] = useState<TeacherActionBrief | null>(null);
  const [source, setSource] = useState<'server' | 'device' | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (online) {
        try {
          const remote = await apiFetch<TeacherActionBrief>('/api/v1/teacher-brief');
          if (active) {
            setBrief(remote);
            setSource('server');
            return;
          }
        } catch {
          // fall through to the on-device brief
        }
      }
      const local = await buildLocalBrief();
      if (active) {
        setBrief(local);
        setSource('device');
      }
    })();
    return () => {
      active = false;
    };
  }, [online]);

  if (!brief) return <div className="boot">Building teacher action brief…</div>;

  return (
    <div className="panel teacher-panel">
      <div className="panel__head">
        <div>
          <div className="teacher-panel__badge-row">
            <span className="lesson-card__badge">TEACHER ACTION BRIEF</span>
            <span className={`pill ${source === 'server' ? 'pill--ok' : 'pill--offline'}`}>
              {source === 'server' ? 'Verified by Server Agent' : 'Device-Local Estimate'}
            </span>
          </div>
          <h1>Class Diagnostic Overview</h1>
          <p className="panel__meta">
            Target Class: <strong>{brief.class_name}</strong> · Generated {formatRelative(brief.generated_at)}
          </p>
        </div>
      </div>

      <div className="statgrid">
        {Object.entries(brief.totals).map(([status, count]) => (
          <div key={status} className="stat">
            <span className="stat__value">{count}</span>
            <span className="stat__label">{status.replace(/_/g, ' ')}</span>
          </div>
        ))}
      </div>

      <div className="teacher-panel__grid">
        <div className="teacher-panel__col">
          <section className="card">
            <h2 className="card__title">Priority Misconception Clusters</h2>
            <p className="card__subtitle">Aggregated from class-wide diagnostic probe errors</p>

            {brief.top_misconceptions.length === 0 ? (
              <p className="muted">No unresolved misconceptions recorded on this device yet.</p>
            ) : (
              <ul className="clusters">
                {brief.top_misconceptions.map((cluster) => (
                  <li key={cluster.misconception_id ?? cluster.label_en}>
                    <div>
                      <strong>{cluster.label_en}</strong>
                      <span className="muted"> · {cluster.label_or}</span>
                    </div>
                    <span className="pill pill--bag">{cluster.bucket}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {brief.suggested_intervention && (
            <section className="card card--accent">
              <h2 className="card__title">Recommended Whole-Class Intervention</h2>
              <p className="intervention-prompt-or">{brief.suggested_intervention.prompt_or}</p>
              <p className="muted intervention-prompt-en">{brief.suggested_intervention.prompt_en}</p>
            </section>
          )}
        </div>

        <div className="teacher-panel__col">
          <section className="card">
            <h2 className="card__title">Learners Needing Direct Attention</h2>
            <p className="card__subtitle">Flagged for targeted one-on-one follow-up</p>
            {brief.learners_needing_follow_up.length === 0 ? (
              <p className="muted">No learners flagged for intervention this cycle.</p>
            ) : (
              <div className="chips">
                {brief.learners_needing_follow_up.map((name) => (
                  <span key={name} className="chip chip--flag">
                    👤 {name}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <h2 className="card__title">Next Lesson Pack Focus</h2>
            <p className="card__subtitle">Adaptive concepts assigned to learners</p>
            <table className="summary__table">
              <thead>
                <tr>
                  <th>Learner</th>
                  <th>Concept</th>
                  <th>Curriculum Rationale</th>
                </tr>
              </thead>
              <tbody>
                {brief.next_pack_focus.map((focus) => (
                  <tr key={focus.profile_id}>
                    <td>
                      <strong>{focus.profile_id}</strong>
                    </td>
                    <td>{focus.concept_title_or}</td>
                    <td className="muted">{focus.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  );
}
