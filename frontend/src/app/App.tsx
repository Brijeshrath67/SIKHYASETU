import { useCallback, useEffect, useState, type ReactNode } from 'react';
import './app.css';

import { AppProviders } from './providers/AppProviders';
import { ErrorBoundary } from './shell/ErrorBoundary';
import { RootLayout, type ViewKey } from './shell/RootLayout';
import { ProfileGate } from '../features/learner/ProfileGate';
import { DashboardView } from '../features/home/DashboardView';
import { LessonFlow } from '../features/lessons/LessonFlow';
import { TeacherBriefPanel } from '../features/teacher/TeacherBriefPanel';
import { SyncPanel } from '../features/sync/SyncPanel';
import { AgentTracePanel } from '../features/sync/AgentTracePanel';
import type { Profile } from '../shared/types/domain';

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppShell />
      </AppProviders>
    </ErrorBoundary>
  );
}

function AppShell() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState<ViewKey>('home');
  const [mounted, setMounted] = useState<Set<ViewKey>>(() => new Set<ViewKey>(['home']));

  const show = useCallback((next: ViewKey) => {
    setMounted((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
    setView(next);
  }, []);

  // Warm the read-only tabs in the background so their first open is instant.
  useEffect(() => {
    if (!profile) return;
    const timer = window.setTimeout(() => {
      setMounted((prev) => {
        const next = new Set(prev);
        next.add('teacher');
        next.add('trace');
        next.add('sync');
        return next;
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [profile]);

  if (!profile) {
    return <ProfileGate onSelect={setProfile} />;
  }

  return (
    <RootLayout
      profile={profile}
      view={view}
      onViewChange={show}
      onSwitchProfile={() => setProfile(null)}
    >
      <div className="views">
        <View active={view === 'home'} mounted={mounted.has('home')}>
          <DashboardView profile={profile} onNavigate={show} />
        </View>
        <View active={view === 'lessons'} mounted={mounted.has('lessons')}>
          <LessonFlow key={profile.id} profile={profile} />
        </View>
        <View active={view === 'teacher'} mounted={mounted.has('teacher')}>
          <TeacherBriefPanel />
        </View>
        <View active={view === 'trace'} mounted={mounted.has('trace')}>
          <AgentTracePanel profileId={profile.id} />
        </View>
        <View active={view === 'sync'} mounted={mounted.has('sync')}>
          <SyncPanel />
        </View>
      </div>
    </RootLayout>
  );
}

function View({ active, mounted, children }: { active: boolean; mounted: boolean; children: ReactNode }) {
  if (!mounted) return null;
  return (
    <section className={`view ${active ? 'is-active' : ''}`} aria-hidden={!active}>
      {children}
    </section>
  );
}
