import { useEffect, useState } from 'react';

import { listProfiles } from '../../shared/services/dexie/db';
import type { Profile } from '../../shared/types/domain';

export function ProfileGate({ onSelect }: { onSelect: (profile: Profile) => void }) {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);

  useEffect(() => {
    void listProfiles().then(setProfiles);
  }, []);

  if (!profiles) return <div className="boot">Loading learners…</div>;

  return (
    <div className="gate">
      <header className="gate__header">
        <div className="gate__brand">
          <span className="gate__logo-badge">ଶି</span>
          <div>
            <div className="gate__title-row">
              <h1 className="gate__title">SikhyaSetu</h1>
              <span className="gate__tag">ଶିଖ୍ୟା ସେତୁ</span>
            </div>
            <p className="gate__subtitle">Offline-First Diagnostic Science Learning</p>
          </div>
        </div>

        <p className="gate__desc">
          Select a learner profile to begin today's lesson. All diagnostic probes, misconceptions
          repair, and practice runs run completely offline on your device.
        </p>
      </header>

      <section className="gate__content">
        <div className="gate__section-title">
          <h2>Select Learner Profile</h2>
          <span className="gate__section-sub">ଶିକ୍ଷାର୍ଥୀ ଚୟନ କରନ୍ତୁ</span>
        </div>

        <div className="gate__grid">
          {profiles.map((profile, idx) => {
            const avatarColorClass = idx % 2 === 0 ? 'cards__avatar--blue' : 'cards__avatar--emerald';
            return (
              <button
                key={profile.id}
                type="button"
                className="cards"
                onClick={() => onSelect(profile)}
              >
                <div className="cards__top">
                  <span className={`cards__avatar ${avatarColorClass}`}>
                    {profile.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="cards__info">
                    <span className="cards__name">{profile.name}</span>
                    <span className="cards__meta">{profile.grade} · {profile.subject}</span>
                  </div>
                  <span className="cards__lang-tag">{profile.language}</span>
                </div>

                <div className="cards__divider" />

                <div className="cards__metrics">
                  <div className="cards__metric-item">
                    <span className="cards__metric-label">Session Target</span>
                    <span className="cards__metric-val">{profile.session_minutes} min</span>
                  </div>
                  <div className="cards__metric-item">
                    <span className="cards__metric-label">Data Limit</span>
                    <span className="cards__metric-val">{profile.data_budget_mb} MB</span>
                  </div>
                  <div className="cards__metric-item">
                    <span className="cards__metric-label">Sync Privacy</span>
                    <span className="cards__metric-val">
                      {profile.consent_identification ? 'Class Roster' : 'Pseudonymous'}
                    </span>
                  </div>
                </div>

                <div className="cards__action">
                  <span>Start Learning</span>
                  <span className="cards__arrow">→</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <footer className="gate__footer">
        <div className="gate__privacy-box">
          <span className="gate__privacy-dot" />
          <span>
            <strong>Offline Privacy Mode Active:</strong> Voice responses and lesson progress are stored
            securely on this device. Sync with the school server occurs only when triggered.
          </span>
        </div>
      </footer>
    </div>
  );
}
