import Dexie, { type Table } from 'dexie';

import seedBundleRaw from '../../content/seed-packs.json';
import type { Fingerprint, LessonPack, Profile, TeachBackGrade } from '../../types/domain';
import type { SyncEvent } from '../../types/events';

export type QueuedEvent = SyncEvent & {
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
};

export type StoredTeachBack = {
  profile_id: string;
  concept_id: string;
  transcript: string;
  audio_kb: number;
  created_at: string;
  grade?: TeachBackGrade | null;
};

export type MetaRecord = { key: string; value: string };

export type StoredFingerprint = Fingerprint & { key: string };

export type SeedBundle = {
  version: string;
  generated_at: string;
  profiles: Profile[];
  packs: Record<string, LessonPack>;
};

const seedBundle = seedBundleRaw as unknown as SeedBundle;

export function masteryKey(profileId: string, conceptId: string): string {
  return `${profileId}:${conceptId}`;
}

export class SikhyaSetuDB extends Dexie {
  profiles!: Table<Profile, string>;
  packs!: Table<LessonPack, string>;
  events!: Table<QueuedEvent, string>;
  mastery!: Table<StoredFingerprint, string>;
  teachBacks!: Table<StoredTeachBack, number>;
  meta!: Table<MetaRecord, string>;

  constructor() {
    super('sikhyasetu');
    this.version(1).stores({
      profiles: 'id',
      packs: 'pack_id, profile_id',
      events: 'id, profile_id, status',
      mastery: 'key, profile_id, concept_id',
      teachBacks: '++id, profile_id, concept_id',
      meta: 'key',
    });
  }
}

export const db = new SikhyaSetuDB();

/** Seed bundled profiles + packs once, so the app works with no network. */
export async function ensureSeeded(force = false): Promise<void> {
  const seededVersion = await getMeta('seed_version');
  if (!force && seededVersion === seedBundle.version) return;

  await db.transaction('rw', db.profiles, db.packs, db.meta, async () => {
    for (const profile of seedBundle.profiles) {
      await db.profiles.put(profile);
    }
    for (const pack of Object.values(seedBundle.packs)) {
      await db.packs.put(pack);
    }
    await db.meta.put({ key: 'seed_version', value: seedBundle.version });
    await db.meta.put({ key: 'seed_generated_at', value: seedBundle.generated_at });
  });
}

export async function getMeta(key: string): Promise<string | undefined> {
  return (await db.meta.get(key))?.value;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await db.meta.put({ key, value });
}

export async function listProfiles(): Promise<Profile[]> {
  const profiles = await db.profiles.toArray();
  return profiles.sort((a, b) => a.id.localeCompare(b.id));
}

export async function getProfile(id: string): Promise<Profile | undefined> {
  return db.profiles.get(id);
}

export async function getPack(packId: string): Promise<LessonPack | undefined> {
  return db.packs.get(packId);
}

export async function latestPackForProfile(profileId: string): Promise<LessonPack | undefined> {
  const packs = await db.packs.where('profile_id').equals(profileId).toArray();
  const sorted = packs.sort((a, b) => a.generated_at.localeCompare(b.generated_at));
  return sorted[sorted.length - 1];
}

export async function storePack(pack: LessonPack): Promise<void> {
  await db.packs.put(pack);
}

export async function queueEvent(event: SyncEvent): Promise<void> {
  const existing = await db.events.get(event.id);
  if (existing) return;
  await db.events.put({
    ...event,
    status: 'pending',
    attempts: 0,
    _queuedAt: new Date().toISOString(),
  });
}

export async function pendingEvents(profileId?: string): Promise<QueuedEvent[]> {
  let events = await db.events.where('status').equals('pending').toArray();
  if (profileId) events = events.filter((e) => e.profile_id === profileId);
  return events.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function markEvents(ids: string[], status: QueuedEvent['status']): Promise<void> {
  await db.transaction('rw', db.events, async () => {
    for (const id of ids) {
      const event = await db.events.get(id);
      if (event) await db.events.put({ ...event, status, attempts: event.attempts + 1 });
    }
  });
}

export async function getFingerprint(
  profileId: string,
  conceptId: string,
): Promise<StoredFingerprint | undefined> {
  return db.mastery.get(masteryKey(profileId, conceptId));
}

export async function putFingerprint(fingerprint: Fingerprint): Promise<void> {
  await db.mastery.put({
    ...fingerprint,
    key: masteryKey(fingerprint.profile_id, fingerprint.concept_id),
  });
}

export async function listFingerprints(profileId: string): Promise<Fingerprint[]> {
  return db.mastery.where('profile_id').equals(profileId).toArray();
}

export async function recordTeachBack(entry: StoredTeachBack): Promise<void> {
  await db.teachBacks.add(entry);
}
