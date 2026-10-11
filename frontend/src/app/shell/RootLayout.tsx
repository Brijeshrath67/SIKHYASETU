import type { Profile } from '../../shared/types/domain';
import { useSync } from '../../features/sync/SyncProvider';
import { useGuru } from '../../features/guru/GuruProvider';
import { GuruAvatar } from '../../features/guru/GuruAvatar';
import { formatRelative } from '../../shared/utils/format';
import { HomeIcon, LessonIcon, SparkIcon, SyncIcon, TraceIcon } from './icons';

export type ViewKey = 'home' | 'lessons' | 'teacher' | 'trace' | 'sync';

type NavItem = {
  key: ViewKey;
  label: string;
  Icon: typeof HomeIcon;
  badge?: string;
};

type NavGroup = {
  heading: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'LEARNER PORTAL',
    items: [
      { key: 'home', label: 'Dashboard', Icon: HomeIcon },
      { key: 'lessons', label: 'Active Lessons', Icon: LessonIcon },
    ],
  },
  {
    heading: 'DIAGNOSTICS & TEACHER',
    items: [
      { key: 'teacher', label: 'Teacher Action Brief', Icon: SparkIcon },
      { key: 'trace', label: 'Reasoning Trace', Icon: TraceIcon },
    ],
  },
  {
    heading: 'SYSTEM & SYNC',
    items: [
      { key: 'sync', label: 'Sync & Data Budget', Icon: SyncIcon },
    ],
  },
];

type Props = {
  profile: Profile;
  view: ViewKey;
  onViewChange: (view: ViewKey) => void;
  onSwitchProfile: () => void;
  children: React.ReactNode;
};

export function RootLayout({ profile, view, onViewChange, onSwitchProfile, children }: Props) {
  const { online, pending, lastSyncedAt, syncing, syncNow } = useSync();
  const { openGuru } = useGuru();

  return (
    <div className="app">
      <aside className="rail">
        <div className="rail__brand">
          <span className="rail__logo">ଶି</span>
          <div className="rail__brand-text">
            <strong>SikhyaSetu</strong>
            <span className="rail__tag">Odisha EdTech · Offline</span>
          </div>
        </div>

        <button
          type="button"
          className="rail__guru"
          onClick={() => openGuru()}
          title="Open Offline Study Assistant"
        >
          <GuruAvatar size={34} mood="idle" />
          <div className="rail__guru-info">
            <strong>Study Assistant</strong>
            <em>Interactive Science Guide</em>
          </div>
        </button>

        <nav className="rail__nav" aria-label="Main Navigation">
          {NAV_GROUPS.map((group) => (
            <div key={group.heading} className="rail__nav-group">
              <span className="rail__nav-heading">{group.heading}</span>
              {group.items.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  className={`rail__link ${view === key ? 'is-active' : ''}`}
                  onClick={() => onViewChange(key)}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                  {key === 'sync' && pending > 0 && (
                    <span className="rail__nav-pill">{pending}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="rail__foot">
          <div className="rail__status-card">
            <div className="rail__status-row">
              <span className={`status-dot ${online ? 'status-dot--online' : 'status-dot--offline'}`} />
              <span className="rail__status-text">{online ? 'Server Connected' : 'Offline Mode'}</span>
            </div>
            <span className="rail__status-sub">
              {pending > 0 ? `${pending} events queued locally` : 'All events synchronized'}
            </span>
          </div>
          <button
            type="button"
            className="rail__sync-btn"
            onClick={() => void syncNow()}
            disabled={syncing}
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </aside>

      <div className="app__main">
        <header className="topbar">
          <div className="topbar__learner">
            <span className="topbar__avatar">{profile.name.slice(0, 1).toUpperCase()}</span>
            <div className="topbar__details">
              <div className="topbar__name-row">
                <strong className="topbar__name">{profile.name}</strong>
                <span className="topbar__badge">{profile.grade}</span>
                <span className="topbar__lang">{profile.language} Medium</span>
              </div>
              <span className="topbar__meta">
                Session Target: {profile.session_minutes} min · Data Allocation: {profile.data_budget_mb} MB
              </span>
            </div>
          </div>
          <div className="topbar__right">
            <div className="topbar__sync-badge">
              <span className="topbar__sync-info">
                Synced {formatRelative(lastSyncedAt)}
              </span>
            </div>
            <button type="button" className="ghost-btn" onClick={onSwitchProfile}>
              Switch Learner
            </button>
          </div>
        </header>

        <main className="content">{children}</main>

        <footer className="appfooter">
          <span>SikhyaSetu v1.0 · Odia Medium Science Platform · Zero API Calls in Loop</span>
        </footer>
      </div>

      <button
        type="button"
        className="guru-fab"
        onClick={() => openGuru()}
        aria-label="Open Study Assistant"
      >
        <GuruAvatar size={26} mood="idle" />
        <span className="guru-fab__label">Study Guide</span>
      </button>
    </div>
  );
}
