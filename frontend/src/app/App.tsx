import { useEffect, useMemo, useState } from 'react';

import { apiFetch } from '../lib/api';
import {
  defaultProfiles,
  loadProfiles,
  loadQueuedEvents,
  makeEventId,
  makeLocalPack,
  saveProfiles,
  saveQueuedEvents,
} from '../lib/local-store';
import type { LessonPack, Profile, SyncEvent, TeacherBrief } from '../types';

function determineDiagnosis(pack: LessonPack, selectedValue: string) {
  if (pack.concept === 'Current and Resistance') {
    return {
      concept: pack.concept,
      misconception: selectedValue.includes('used up') ? 'current gets used up' : 'needs prerequisite repair',
      confidence: 0.82,
      evidence: [
        'Selected distractor suggests current is being consumed rather than conserved.',
        'The learner needs a counter-example that separates current flow from brightness change.',
      ],
      intervention:
        'Use the two-bulb comparison prompt and ask learners to explain where the brightness changes before talking about current being used up.',
      next_review: 'Tomorrow, same concept with a new bulb arrangement',
    };
  }

  if (pack.concept === 'Force and Motion') {
    return {
      concept: pack.concept,
      misconception: selectedValue.includes('stored force') ? 'force is contained in the object' : 'needs prerequisite repair',
      confidence: 0.8,
      evidence: [
        'Selected distractor treats force as something stored in the object.',
        'The learner needs a friction-and-braking counter-example to separate force from motion.',
      ],
      intervention:
        'Use a bicycle-braking counter-example and a short prerequisite on interacting forces.',
      next_review: 'Tomorrow, same concept with a different object',
    };
  }

  return {
    concept: pack.concept,
    misconception: 'needs prerequisite repair',
    confidence: 0.76,
    evidence: ['The answer pattern was too weak for a confident misconception label.'],
    intervention: 'Revisit the foundational idea with a quick worked example and a short concept check.',
    next_review: 'Revisit in the next short practice pack',
  };
}

function App() {
  const [profiles, setProfiles] = useState<Profile[]>(() => loadProfiles());
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    () => loadProfiles()[0]?.id ?? defaultProfiles[0].id,
  );
  const [pack, setPack] = useState<LessonPack | null>(null);
  const [diagnosis, setDiagnosis] = useState<ReturnType<typeof determineDiagnosis> | null>(null);
  const [teachBackText, setTeachBackText] = useState('');
  const [queuedEvents, setQueuedEvents] = useState<SyncEvent[]>(() => loadQueuedEvents());
  const [syncStatus, setSyncStatus] = useState('Offline ready');
  const [teacherBrief, setTeacherBrief] = useState<TeacherBrief | null>(null);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? profiles[0],
    [profiles, selectedProfileId],
  );

  useEffect(() => {
    saveProfiles(profiles);
  }, [profiles]);

  useEffect(() => {
    saveQueuedEvents(queuedEvents);
  }, [queuedEvents]);

  useEffect(() => {
    void fetchPack(selectedProfileId);
  }, [selectedProfileId]);

  const fetchPack = async (profileId: string) => {
    try {
      const payload = await apiFetch<LessonPack>(`/api/v1/lesson-packs/${profileId}/next`);
      setPack(payload);
      setDiagnosis(null);
      setTeachBackText('');
      setSyncStatus('Connected: lesson pack loaded from cloud');
    } catch {
      const localPack = makeLocalPack(profileId);
      setPack(localPack);
      setDiagnosis(null);
      setTeachBackText('');
      setSyncStatus('Offline mode: using signed local pack');
    }
  };

  const handleAnswer = (optionValue: string) => {
    if (!pack) return;
    const nextDiagnosis = determineDiagnosis(pack, optionValue);
    setDiagnosis(nextDiagnosis);

    const event: SyncEvent = {
      id: makeEventId(),
      profile_id: selectedProfileId,
      type: 'probe_answered',
      details: {
        concept: pack.concept,
        selected_value: optionValue,
        misconception: nextDiagnosis.misconception,
      },
      created_at: new Date().toISOString(),
    };
    setQueuedEvents((current) => [...current, event]);
  };

  const handleTeachBack = () => {
    if (!pack || !diagnosis || !teachBackText.trim()) return;

    const event: SyncEvent = {
      id: makeEventId(),
      profile_id: selectedProfileId,
      type: 'teachback_recorded',
      details: {
        concept: pack.concept,
        misconception: diagnosis.misconception,
        transcript: teachBackText.trim(),
      },
      created_at: new Date().toISOString(),
    };

    setQueuedEvents((current) => [...current, event]);
    setSyncStatus('Teach-back saved offline. It will sync when the network returns.');
    setTeachBackText('');
  };

  const syncNow = async () => {
    if (!queuedEvents.length) {
      setSyncStatus('No queued events to sync.');
      return;
    }

    try {
      const result = await apiFetch<{ accepted: number; status: string }>('/api/v1/events/sync', {
        method: 'POST',
        body: JSON.stringify({ events: queuedEvents }),
      });

      setQueuedEvents([]);
      saveQueuedEvents([]);
      setSyncStatus(`Sync complete: ${result.accepted} events sent.`);

      const brief = await apiFetch<TeacherBrief>(`/api/v1/teacher-brief?class_name=${encodeURIComponent('Class 9 Science')}`);
      setTeacherBrief(brief);
    } catch {
      setSyncStatus('Network unavailable. Events remain queued locally for retry.');
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Offline-first learner loop</p>
          <h1>SikhyaSetu</h1>
        </div>
        <button className="sync-button" onClick={syncNow}>
          Sync now
        </button>
      </header>

      <section className="summary-grid">
        <aside className="panel">
          <h2>Profiles</h2>
          <div className="profile-list">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                className={profile.id === selectedProfileId ? 'profile-card active' : 'profile-card'}
                onClick={() => setSelectedProfileId(profile.id)}
              >
                <span>{profile.name}</span>
                <small>{profile.grade}</small>
              </button>
            ))}
          </div>
          {selectedProfile && (
            <div className="meta-box">
              <strong>{selectedProfile.name}</strong>
              <p>
                {selectedProfile.session_minutes} mins • {selectedProfile.data_budget_mb} MB
              </p>
            </div>
          )}
        </aside>

        <section className="panel lesson-panel">
          {pack ? (
            <>
              <div className="lesson-header">
                <div>
                  <p className="eyebrow">Today’s plan</p>
                  <h2>{pack.title}</h2>
                </div>
                <span className="badge">{pack.budget_kb} KB</span>
              </div>

              <p className="objective">{pack.objective}</p>
              <p className="explanation">{pack.explanation}</p>

              <div className="question-block">
                <h3>{pack.probe_question}</h3>
                <div className="option-list">
                  {pack.options.map((option) => (
                    <button key={`${pack.pack_id}-${option.label}`} className="option-button" onClick={() => handleAnswer(option.value)}>
                      <span>{option.label}</span>
                      <p>{option.value}</p>
                    </button>
                  ))}
                </div>
              </div>

              {diagnosis && (
                <div className="diagnosis-box">
                  <p className="eyebrow">Diagnosis</p>
                  <h3>Likely misconception</h3>
                  <p>{diagnosis.misconception}</p>
                  <ul>
                    {diagnosis.evidence.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                  <p>
                    <strong>Recommended intervention:</strong> {diagnosis.intervention}
                  </p>
                </div>
              )}

              {diagnosis && (
                <div className="teachback-box">
                  <label htmlFor="teachback">Teach-back in Odia</label>
                  <textarea
                    id="teachback"
                    value={teachBackText}
                    onChange={(event) => setTeachBackText(event.target.value)}
                    placeholder={pack.teach_back_prompt}
                  />
                  <button className="primary-button" onClick={handleTeachBack}>
                    Save teach-back
                  </button>
                </div>
              )}
            </>
          ) : (
            <p>Loading pack...</p>
          )}
        </section>
      </section>

      <section className="bottom-grid">
        <div className="panel">
          <h3>Sync status</h3>
          <p>{syncStatus}</p>
          <p>Queued events: {queuedEvents.length}</p>
          <ul className="event-list">
            {queuedEvents.slice(0, 4).map((event) => (
              <li key={event.id}>{event.type} • {String(event.details.concept ?? 'concept')}</li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <h3>Teacher action brief</h3>
          {teacherBrief ? (
            <>
              <p>{teacherBrief.suggested_prompt}</p>
              <ul>
                {teacherBrief.top_misconceptions.map((item) => (
                  <li key={item.label}>
                    {item.label}: {item.count} learners
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>Sync a batch to generate the brief.</p>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;

