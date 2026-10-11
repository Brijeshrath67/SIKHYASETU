import { useEffect, useMemo, useState } from 'react';

import { MasteryRing, StatTile } from '../../shared/components/ui';
import { GuruAvatar } from '../guru/GuruAvatar';
import { useGuru } from '../guru/GuruProvider';
import { useSync } from '../sync/SyncProvider';
import { listFingerprints } from '../../shared/services/dexie/db';
import { contentLibrary, getConcept } from '../../shared/lib/offline/library';
import { MASTERED_THRESHOLD, BASE_MASTERY } from '../../shared/lib/offline/tutor';
import { percent } from '../../shared/utils/format';
import type { Fingerprint, Profile } from '../../shared/types/domain';
import type { ViewKey } from '../../app/shell/RootLayout';

type Props = {
  profile: Profile;
  onNavigate: (view: ViewKey) => void;
};

export function DashboardView({ profile, onNavigate }: Props) {
  const { openGuru } = useGuru();
  const sync = useSync();
  const [fingerprints, setFingerprints] = useState<Fingerprint[]>([]);

  useEffect(() => {
    let active = true;
    void listFingerprints(profile.id).then((rows) => {
      if (active) setFingerprints(rows);
    });
    return () => {
      active = false;
    };
  }, [profile.id, sync.pending, sync.lastSyncedAt]);

  const byConcept = useMemo(
    () => new Map(fingerprints.map((row) => [row.concept_id, row])),
    [fingerprints],
  );

  const stats = useMemo(() => {
    const total = contentLibrary.concepts.length;
    const mastered = fingerprints.filter((row) => row.status === 'mastered' || row.mastery >= MASTERED_THRESHOLD).length;
    const repairing = fingerprints.filter((row) => row.status === 'repairing').length;
    const avg = fingerprints.length
      ? fingerprints.reduce((sum, row) => sum + row.mastery, 0) / fingerprints.length
      : BASE_MASTERY;
    const due = fingerprints.filter(
      (row) => row.next_review_at != null && new Date(row.next_review_at).getTime() <= Date.now(),
    );
    return { total, mastered, repairing, avg, due };
  }, [fingerprints]);

  const reviewTarget = stats.due[0] ?? null;
  const reviewConcept = reviewTarget ? getConcept(reviewTarget.concept_id) : null;
  const chapters = contentLibrary.chapters;

  return (
    <div className="dash">
      <section className="dash-hero">
        <div className="dash-hero__body">
          <div className="dash-hero__badge-row">
            <span className="dash-hero__eyebrow">ନମସ୍କାର, {profile.name}! · Welcome back</span>
            <span className="dash-hero__status-tag">Grade 9 Science</span>
          </div>
          <h1>Learning Roadmap & Next Step</h1>
          <p className="dash-hero__desc">
            {reviewConcept ? (
              <>
                Scheduled revision target:{' '}
                <strong>“{reviewConcept.title_en}” ({reviewConcept.title_or})</strong>. A quick refresher
                will solidify your mastery before the next diagnostic pack.
              </>
            ) : (
              'All previous topics are currently retained. Begin your next adaptive lesson pack to explore new concepts.'
            )}
          </p>
          <div className="dash-hero__actions">
            <button type="button" className="primary-btn" onClick={() => onNavigate('lessons')}>
              {fingerprints.length ? 'Continue Lesson' : 'Start First Lesson'} →
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => openGuru(reviewConcept?.id ?? null)}
            >
              Ask Study Assistant
            </button>
          </div>
        </div>

        <div className="dash-hero__summary-card">
          <div className="dash-hero__summary-header">
            <GuruAvatar size={40} mood="idle" />
            <div>
              <span className="dash-hero__summary-title">Offline Engine Active</span>
              <span className="dash-hero__summary-sub">Zero network dependency</span>
            </div>
          </div>
          <div className="dash-hero__summary-metrics">
            <div className="dash-hero__summary-item">
              <span className="dash-hero__summary-val">{stats.mastered}/{stats.total}</span>
              <span className="dash-hero__summary-lbl">Mastered</span>
            </div>
            <div className="dash-hero__summary-item">
              <span className="dash-hero__summary-val">{percent(stats.avg)}</span>
              <span className="dash-hero__summary-lbl">Avg Score</span>
            </div>
            <div className="dash-hero__summary-item">
              <span className="dash-hero__summary-val">{stats.due.length}</span>
              <span className="dash-hero__summary-lbl">Due Review</span>
            </div>
          </div>
        </div>
      </section>

      <section className="dash-stats">
        <StatTile
          value={`${stats.mastered}/${stats.total}`}
          label="Concepts Mastered"
          sub="Verified by rubric"
          tone="ok"
        />
        <StatTile
          value={percent(stats.avg)}
          label="Average Mastery"
          sub="Across all attempts"
          tone="brand"
        />
        <StatTile
          value={String(stats.repairing)}
          label="Concepts in Repair"
          sub="Misconception targeted"
          tone="warn"
        />
        <StatTile
          value={String(stats.due.length)}
          label="Revision Queue"
          sub="Spaced repetition"
          tone={stats.due.length ? 'bad' : 'ok'}
        />
      </section>

      {stats.due.length > 0 && (
        <section className="dash-panel">
          <div className="dash-panel__head">
            <div>
              <h2>Scheduled Revision Targets</h2>
              <span className="muted">Spaced-repetition intervals due today</span>
            </div>
            <span className="badge">{stats.due.length} due</span>
          </div>
          <ul className="review-list">
            {stats.due.map((row) => {
              const concept = getConcept(row.concept_id);
              return (
                <li key={row.concept_id} className="review-list__item">
                  <MasteryRing mastery={row.mastery} />
                  <div className="review-list__meta">
                    <strong>{concept?.title_en ?? row.concept_id}</strong>
                    <span className="muted or">{concept?.title_or ?? ''}</span>
                  </div>
                  <div className="review-list__actions">
                    <button type="button" className="ghost-btn" onClick={() => openGuru(row.concept_id)}>
                      Study Guide
                    </button>
                    <button type="button" className="primary-btn" onClick={() => onNavigate('lessons')}>
                      Revise Now
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="dash-panel">
        <div className="dash-panel__head">
          <div>
            <h2>Curriculum & Mastery Grid</h2>
            <span className="muted">{chapters.length} chapters · {stats.total} science concepts</span>
          </div>
        </div>
        {chapters.map((chapter) => (
          <div key={chapter.id} className="syllabus-chapter">
            <div className="syllabus-chapter__head">
              <h3>{chapter.title_en}</h3>
              <span className="syllabus-chapter__meta">
                {contentLibrary.concepts.filter((c) => c.chapter_id === chapter.id).length} topics
              </span>
            </div>
            <div className="syllabus-grid">
              {contentLibrary.concepts
                .filter((concept) => concept.chapter_id === chapter.id)
                .map((concept) => {
                  const fingerprint = byConcept.get(concept.id);
                  const mastery = fingerprint?.mastery ?? 0;
                  const status = fingerprint?.status;
                  return (
                    <button
                      key={concept.id}
                      type="button"
                      className={`concept-card ${status === 'mastered' ? 'is-mastered' : ''}`}
                      onClick={() => openGuru(concept.id)}
                      title={`Open study guide for ${concept.title_en}`}
                    >
                      <div className="concept-card__top">
                        <MasteryRing mastery={mastery} hasData={Boolean(fingerprint)} />
                        {status && (
                          <span className={`concept-card__badge concept-card__badge--${status}`}>
                            {status === 'mastered' ? 'Mastered' : status === 'repairing' ? 'In Repair' : 'Practiced'}
                          </span>
                        )}
                      </div>
                      <div className="concept-card__text">
                        <span className="concept-card__title or">{concept.title_or}</span>
                        <span className="concept-card__title en">{concept.title_en}</span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

export { MasteryRing, StatTile } from '../../shared/components/ui';
