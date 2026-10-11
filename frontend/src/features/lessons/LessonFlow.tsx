import { useEffect, useMemo, useRef, useState } from 'react';

import { useSync } from '../sync/SyncProvider';
import { useGuru } from '../guru/GuruProvider';
import {
  getFingerprint,
  latestPackForProfile,
  putFingerprint,
  queueEvent,
  recordTeachBack,
  storePack,
  type StoredFingerprint,
} from '../../shared/services/dexie/db';
import { apiFetch } from '../../shared/services/api/client';
import { verifyPack } from '../../shared/services/integrity/canonical';
import {
  BASE_MASTERY,
  afterProbe,
  afterTeachBack,
  diagnoseProbe,
  gradeTeachBack,
  type OfflineGrade,
  type ProbeOutcome,
} from '../../shared/lib/offline/tutor';
import { newId } from '../../shared/utils/ids';
import { percent } from '../../shared/utils/format';
import type { LessonPack, Profile } from '../../shared/types/domain';
import { Stepper, type StepItem } from '../../shared/components/ui/Stepper';
import { PackHeader } from './components/PackHeader';
import { TeachBackStep } from './components/TeachBackStep';
import { SessionSummary, type ConceptResult } from './components/SessionSummary';

type Phase = 'learn' | 'probe' | 'diagnosis' | 'teachback' | 'result';

const LESSON_STEPS: StepItem[] = [
  { key: 'learn', label: 'Concept Review', labelOr: 'ଧାରଣା' },
  { key: 'probe', label: 'Check-In Probe', labelOr: 'ଯାଞ୍ଚ' },
  { key: 'diagnosis', label: 'Diagnostic', labelOr: 'ନିରାକରଣ' },
  { key: 'teachback', label: 'Teach-Back', labelOr: 'ବୁଝାଅ' },
  { key: 'result', label: 'Evaluation', labelOr: 'ମୂଲ୍ୟାଙ୍କନ' },
];

const nowIso = () => new Date().toISOString();

export function LessonFlow({ profile }: { profile: Profile }) {
  const sync = useSync();
  const { openGuru } = useGuru();
  const [pack, setPack] = useState<LessonPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>('learn');
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<ProbeOutcome | null>(null);
  const [grade, setGrade] = useState<OfflineGrade | null>(null);
  const [transcript, setTranscript] = useState('');
  const [audioKb, setAudioKb] = useState(0);
  const [masteryBefore, setMasteryBefore] = useState(BASE_MASTERY);
  const [results, setResults] = useState<ConceptResult[]>([]);
  const startedRef = useRef(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const local = await latestPackForProfile(profile.id);
      if (local) {
        if (active) {
          setPack(local);
          setLoading(false);
        }
        return;
      }
      try {
        const remote = await apiFetch<LessonPack>(`/api/v1/lesson-packs/${profile.id}/next`);
        if (await verifyPack(remote)) await storePack(remote);
        if (active) setPack(remote);
      } catch {
        if (active) setPack(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [profile.id]);

  useEffect(() => {
    if (pack && !startedRef.current) {
      startedRef.current = true;
      void queueEvent({
        id: newId(),
        profile_id: profile.id,
        type: 'session_started',
        pack_id: pack.pack_id,
        details: { concepts: pack.concepts.map((c) => c.concept_id) },
        created_at: nowIso(),
      }).then(sync.refresh);
    }
  }, [pack, profile.id, sync]);

  const current = useMemo(() => (pack ? pack.concepts[index] : undefined), [pack, index]);
  const total = pack ? pack.concepts.length : 0;
  const isLast = index >= total - 1;

  useEffect(() => {
    if (!current) return;
    let active = true;
    void getFingerprint(profile.id, current.concept_id).then((fp) => {
      if (active) setMasteryBefore(fp?.mastery ?? BASE_MASTERY);
    });
    return () => {
      active = false;
    };
  }, [current, profile.id]);

  if (loading) return <div className="boot">Loading signed offline lesson pack…</div>;
  if (!pack || !current) {
    return (
      <div className="card">
        <h2 className="card__title">No pack available</h2>
        <p className="card__explanation">
          All concepts up to date, or the phone has not synced with the school server yet.
        </p>
      </div>
    );
  }

  async function submitProbe() {
    if (!current || !selected || !pack) return;
    const evaluated = diagnoseProbe(pack, current.concept_id, selected);
    setOutcome(evaluated);

    const prevFp = await getFingerprint(profile.id, current.concept_id);
    const prevMastery = prevFp?.mastery ?? BASE_MASTERY;
    const next = afterProbe(prevMastery, evaluated, prevFp);

    const stored: StoredFingerprint = {
      key: `${profile.id}:${current.concept_id}`,
      profile_id: profile.id,
      concept_id: current.concept_id,
      concept_title_or: current.title_or,
      ...next,
    };
    await putFingerprint(stored);

    await queueEvent({
      id: newId(),
      profile_id: profile.id,
      type: 'probe_answered',
      pack_id: pack.pack_id,
      concept_id: current.concept_id,
      details: {
        probe_id: current.probe.probe_id,
        selected,
        correct: evaluated.correct,
        misconception_id: evaluated.misconceptionId,
        mastery_before: prevMastery,
        mastery_after: next.mastery,
      },
      created_at: nowIso(),
    });
    await sync.refresh();

    setPhase('diagnosis');
  }

  async function markInterventionViewed() {
    if (!current || !outcome?.misconceptionId || !pack) {
      setPhase('teachback');
      return;
    }
    await queueEvent({
      id: newId(),
      profile_id: profile.id,
      type: 'intervention_viewed',
      pack_id: pack.pack_id,
      concept_id: current.concept_id,
      details: { misconception_id: outcome.misconceptionId },
      created_at: nowIso(),
    });
    await sync.refresh();
    setPhase('teachback');
  }

  async function submitTeachBack() {
    if (!current || !pack) return;
    const graded = gradeTeachBack(pack, profile.id, current.concept_id, transcript);

    await recordTeachBack({
      profile_id: profile.id,
      concept_id: current.concept_id,
      transcript,
      audio_kb: audioKb,
      created_at: nowIso(),
      grade: graded,
    });

    const prevFp = await getFingerprint(profile.id, current.concept_id);
    const prevMastery = prevFp?.mastery ?? BASE_MASTERY;
    const next = afterTeachBack(prevMastery, graded, prevFp);
    const stored: StoredFingerprint = {
      key: `${profile.id}:${current.concept_id}`,
      profile_id: profile.id,
      concept_id: current.concept_id,
      concept_title_or: current.title_or,
      ...next,
    };
    await putFingerprint(stored);

    await queueEvent({
      id: newId(),
      profile_id: profile.id,
      type: 'teachback_recorded',
      pack_id: pack.pack_id,
      concept_id: current.concept_id,
      details: { transcript, score: graded.score, audio_kb: audioKb },
      created_at: nowIso(),
    });
    await sync.refresh();
    setGrade(graded);
    setResults((prev) => [
      ...prev,
      {
        conceptId: current.concept_id,
        title: current.title_or,
        correct: outcome?.correct ?? false,
        masteryBefore,
        masteryAfter: next.mastery,
        status: next.status,
      },
    ]);
    setPhase('result');
  }

  async function nextConcept() {
    if (!pack) return;
    if (isLast) {
      await queueEvent({
        id: newId(),
        profile_id: profile.id,
        type: 'pack_completed',
        pack_id: pack.pack_id,
        details: { results },
        created_at: nowIso(),
      });
      await sync.refresh();
      setPhase('result');
      setIndex(total);
      return;
    }
    setIndex((i) => i + 1);
    setPhase('learn');
    setSelected(null);
    setOutcome(null);
    setGrade(null);
    setTranscript('');
    setAudioKb(0);
  }

  const finished = index >= pack.concepts.length;

  return (
    <div className="lesson">
      <PackHeader pack={pack} currentIndex={index} total={total} />

      {finished ? (
        <SessionSummary results={results} onRestart={() => window.location.reload()} />
      ) : (
        <section className="lesson__stage">
          <Stepper steps={LESSON_STEPS} activeKey={phase} />

          <div className="progressbar">
            <div
              className="progressbar__fill"
              style={{
                width: `${
                  ((index +
                    (phase === 'learn'
                      ? 0.2
                      : phase === 'probe'
                      ? 0.4
                      : phase === 'diagnosis'
                      ? 0.6
                      : phase === 'teachback'
                      ? 0.8
                      : 1)) /
                    total) *
                  100
                }%`,
              }}
            />
          </div>

          {/* Phase 1: Learn */}
          {phase === 'learn' && (
            <article className="card lesson-card">
              <div className="lesson-card__header">
                <div>
                  <span className="lesson-card__badge">TOPIC REVIEW</span>
                  <h2 className="card__title">{current.title_or}</h2>
                  <p className="card__subtitle">{current.title_en}</p>
                </div>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => openGuru(current.concept_id)}
                >
                  Ask Study Guide
                </button>
              </div>

              <div className="lesson-card__body">
                <div className="lesson-section">
                  <h3 className="lesson-section__title">Learning Objective / ଲକ୍ଷ୍ୟ</h3>
                  <p className="card__objective">{current.objective_or}</p>
                </div>

                <div className="lesson-section">
                  <h3 className="lesson-section__title">Core Concept / ମୂଳ ଧାରଣା</h3>
                  <p className="card__explanation">{current.explanation_or}</p>
                  <p className="card__explanation card__explanation--en muted">{current.explanation_en}</p>
                </div>

                <div className="card__example">
                  <strong>ବାସ୍ତବ ଉଦାହରଣ (Local Context):</strong> {current.local_example_or}
                </div>

                <div className="lesson-section">
                  <h3 className="lesson-section__title">Key Scientific Terms / ମୁଖ୍ୟ ଶବ୍ଦାବଳୀ</h3>
                  <ul className="terms">
                    {current.key_terms.map((term) => (
                      <li key={term.en}>
                        <strong>{term.term_or}</strong>
                        <span>{term.en}</span>
                        <em>{term.gloss_or}</em>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="lesson__cta">
                <button type="button" className="primary-btn" onClick={() => setPhase('probe')}>
                  Start Diagnostic Probe →
                </button>
              </div>
            </article>
          )}

          {/* Phase 2: Probe */}
          {phase === 'probe' && (
            <article className="card lesson-card">
              <span className="lesson-card__badge">DIAGNOSTIC CHECK-IN</span>
              <h2 className="card__title">ଯାଞ୍ଚ ପ୍ରଶ୍ନ (Diagnostic Probe)</h2>
              <p className="card__prompt">{current.probe.prompt_or}</p>
              <p className="card__prompt card__prompt--en muted">{current.probe.prompt_en}</p>

              <div className="options">
                {current.probe.options.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    className={`option ${selected === option.label ? 'option--selected' : ''}`}
                    onClick={() => setSelected(option.label)}
                  >
                    <span className="option__label">{option.label}</span>
                    <span className="option__text">
                      <span className="or">{option.value_or}</span>
                      <span className="en muted">{option.value_en}</span>
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="primary-btn"
                disabled={!selected}
                onClick={() => void submitProbe()}
              >
                Submit Response →
              </button>
            </article>
          )}

          {/* Phase 3: Diagnosis / Repair */}
          {phase === 'diagnosis' && outcome && (
            <article className="card lesson-card">
              <span className={`verdict ${outcome.correct ? 'verdict--ok' : 'verdict--bad'}`}>
                {outcome.correct ? '✓ Correct Understanding' : '⚠ Misconception Identified'}
              </span>

              {outcome.correct ? (
                <>
                  <h2 className="card__title">ସଠିକ୍ ଧାରଣା!</h2>
                  <p className="card__explanation">
                    Your reasoning is aligned with the core scientific principle. Next, demonstrate your
                    mastery by explaining the concept in your own words.
                  </p>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => setPhase('teachback')}
                  >
                    Continue to Teach-Back →
                  </button>
                </>
              ) : (
                <>
                  <h2 className="card__title">
                    {current.intervention?.title_or ?? 'ଚାଲ ଠିକ୍ କରିବା'}
                  </h2>
                  <div className="intervention-box">
                    <p className="card__explanation">{current.intervention?.body_or}</p>
                    <p className="card__example">{current.intervention?.body_en}</p>
                  </div>
                  <div className="lesson__cta">
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() => void markInterventionViewed()}
                    >
                      I Understand — Proceed to Teach-Back →
                    </button>
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => openGuru(current.concept_id)}
                    >
                      Need clarification? Ask Study Guide
                    </button>
                  </div>
                </>
              )}
            </article>
          )}

          {/* Phase 4: Teach-Back */}
          {phase === 'teachback' && (
            <TeachBackStep
              prompt={current.teach_back_prompt_or}
              promptEn={current.teach_back_prompt_en}
              transcript={transcript}
              onTranscript={setTranscript}
              audioKb={audioKb}
              onAudio={setAudioKb}
              onSubmit={() => void submitTeachBack()}
            />
          )}

          {/* Phase 5: Evaluation Result */}
          {phase === 'result' && grade && (
            <article className="card lesson-card">
              <span className="lesson-card__badge">EVALUATION SUMMARY</span>
              <h2 className="card__title">ମୂଲ୍ୟାଙ୍କନ ଫଳାଫଳ (Evaluation)</h2>
              <div className="score">
                <span className="score__value">{percent(grade.score)}</span>
                <span className="score__label">Mastery Rubric Score</span>
              </div>

              <div className="lesson-section">
                <h3 className="lesson-section__title">Deterministic Rubric Criteria</h3>
                <ul className="rubric">
                  {grade.rubric.map((item) => (
                    <li key={item.id} className={item.met ? 'rubric--met' : 'rubric--miss'}>
                      <span>{item.met ? '✓' : '✕'}</span>
                      <div>
                        <strong>{item.id.replace(/_/g, ' ')}</strong>
                        <p>{item.note}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="feedback-box">
                <p className="card__explanation">{grade.feedback_or}</p>
              </div>

              {grade.needs_review && (
                <div className="review-flag">
                  <span className="pill pill--warn">Flagged for Teacher Brief Review</span>
                </div>
              )}

              <button type="button" className="primary-btn" onClick={() => void nextConcept()}>
                {isLast ? 'Complete Pack Session →' : 'Next Topic →'}
              </button>
            </article>
          )}
        </section>
      )}
    </div>
  );
}
