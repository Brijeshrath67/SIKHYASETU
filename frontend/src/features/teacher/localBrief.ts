import { db, latestPackForProfile, listProfiles } from '../../shared/services/dexie/db';
import type { Fingerprint, TeacherActionBrief } from '../../shared/types/domain';

const BUCKET = (count: number): string => (count === 1 ? '1 learner' : `${count} learners`);

function pretty(id: string): string {
  return id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Build a teacher brief from what is on this device, so the teacher still gets
 * value with no connectivity. The server brief supersedes it once synced.
 */
export async function buildLocalBrief(class_name = 'Class 9 Science'): Promise<TeacherActionBrief> {
  const fingerprints = await db.mastery.toArray();
  const profiles = await listProfiles();

  const totals: Record<string, number> = {};
  for (const fingerprint of fingerprints) {
    totals[fingerprint.status] = (totals[fingerprint.status] ?? 0) + 1;
  }

  const byMisconception = new Map<string, Set<string>>();
  for (const fingerprint of fingerprints) {
    if (!fingerprint.misconception_id) continue;
    const set = byMisconception.get(fingerprint.misconception_id) ?? new Set<string>();
    set.add(fingerprint.profile_id);
    byMisconception.set(fingerprint.misconception_id, set);
  }

  const top_misconceptions = [...byMisconception.entries()]
    .map(([id, learners]) => ({
      misconception_id: id,
      label_en: pretty(id),
      label_or: pretty(id),
      concept_id: fingerprints.find((f) => f.misconception_id === id)?.concept_id ?? null,
      affected_learners: learners.size,
      bucket: BUCKET(learners.size),
    }))
    .sort((a, b) => b.affected_learners - a.affected_learners);

  const learners_needing_follow_up = profiles
    .filter((profile) =>
      fingerprints.some(
        (f) => f.profile_id === profile.id && (f.status === 'unresolved' || f.status === 'needs_review'),
      ),
    )
    .map((profile) => profile.name);

  const next_pack_focus: TeacherActionBrief['next_pack_focus'] = [];
  for (const profile of profiles) {
    const pack = await latestPackForProfile(profile.id);
    const primary = pack?.concepts[0];
    if (!pack || !primary) continue;
    const fingerprint: Fingerprint | undefined = fingerprints.find((f) => f.profile_id === profile.id);
    next_pack_focus.push({
      profile_id: profile.id,
      concept_id: primary.concept_id,
      concept_title_or: primary.title_or,
      reason: fingerprint?.misconception_id
        ? `Repair the misconception: ${pretty(fingerprint.misconception_id)}`
        : 'First session: diagnose the priority misconception',
    });
  }

  const top = top_misconceptions[0];
  return {
    class_name,
    generated_at: new Date().toISOString(),
    totals,
    top_misconceptions,
    suggested_intervention: top
      ? {
          misconception_id: top.misconception_id,
          prompt_en: `Ask learners to explain where the idea of "${top.label_en}" breaks down, then act it out.`,
          prompt_or: `ଶିକ୍ଷାର୍ଥୀଙ୍କୁ "${top.label_or}" ଧାରଣା କେଉଁଠି ଭୁଲ୍ ହେଉଛି ବୁଝାଇବାକୁ କୁହନ୍ତୁ।`,
        }
      : null,
    learners_needing_follow_up,
    next_pack_focus,
  };
}
