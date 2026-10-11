/**
 * Deterministic, on-device tutor.
 *
 * Mirrors backend/app/domain/services (grading + mastery) so the lesson loop
 * produces instant, explainable feedback while offline, byte-for-byte
 * consistent with the server's later re-grade. No model calls, no network.
 */

import type {
  Fingerprint,
  FingerprintStatus,
  LessonPack,
  PackConcept,
  RubricCriterion,
  TeachBackGrade,
} from '../../types/domain';

export const BASE_MASTERY = 0.3;
export const MASTERED_THRESHOLD = 0.8;

const MISCONCEPTION_LEXICON: Record<string, string[]> = {
  'force-is-stored': ['stored force', 'internal force', 'contains force', 'ran out of force', 'ଭିତରେ ବଳ', 'ବଳ ସରି', 'ବଳ ରହିଛି'],
  'motion-needs-continuous-force': ['needs a push', 'needs push', 'keep pushing', 'stops when i stop', 'ଠେଲିବା ଆବଶ୍ୟକ', 'ଠେଲୁ ରହିବ', 'ବନ୍ଦ କଲେ ଅଟିଯାଏ'],
  'friction-always-bad': ['friction is bad', 'friction is harmful', 'remove all friction', 'ଘର୍ଷଣ ଖରାପ', 'ଘର୍ଷଣ ହାନିକାରକ'],
  'action-reaction-cancel': ['cancel', 'cancel out', 'they cancel', 'ବାତିଲ', 'ପରସ୍ପରକୁ ବାତିଲ'],
  'current-gets-used-up': ['used up', 'consumed', 'gets consumed', 'runs out of current', 'ବ୍ୟବହାର ହୋଇଯାଏ', 'ସରିଯାଏ', 'ଖର୍ଚ୍ଚ ହୋଇଯାଏ'],
  'current-not-shared-parallel': ['same current in each branch', 'does not divide', 'not divided', 'ଭାଗ ହୁଏ ନାହିଁ', 'ସମାନ ପ୍ରବାହ ପ୍ରତ୍ୟେକ ଶାଖାରେ'],
  'resistance-blocks-all': ['blocks all', 'stops all current', 'no current flows', 'stops the current', 'ସମ୍ପୂର୍ଣ୍ଣ ବନ୍ଦ', 'ପ୍ରବାହ ବନ୍ଦ', 'କୌଣସି ପ୍ରବାହ ନାହିଁ'],
  'resistance-grows-with-current': ['resistance increases with current', 'more current more resistance', 'resistance grows', 'ରୋଧ ବଢ଼େ', 'ଅଧିକ ପ୍ରବାହ ଅଧିକ ରୋଧ'],
  'heat-is-consumed-current': ['current is burned', 'current turns into heat', 'current consumed as heat', 'ପ୍ରବାହ ଜଳି', 'ପ୍ରବାହ ବ୍ୟବହାର ହୋଇ ତାପ'],
};

const MECHANISM_CUES = ['କାରଣ', 'ତେଣୁ', 'ହେତୁ', 'ଫଳରେ', 'ଯୋଗୁଁ', 'because', 'therefore', 'since', 'due to', 'causes', 'results in', 'so that'];

const EXAMPLE_NOUNS = ['ସାଇକେଲ', 'ବଲ୍ବ', 'ତାର', 'ପାଣି', 'ନଦୀ', 'ପାଦ', 'ବଜାର', 'ଭୂମି', 'ଘର', 'ପେଡାଲ', 'ବସ୍', 'bicycle', 'bulb', 'wire', 'water', 'river', 'foot', 'market', 'ground', 'home', 'pedal', 'bus'];

function clamp(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000));
}

export function masteryAfterProbe(current: number, correct: boolean): number {
  return correct ? clamp(current + 0.3) : clamp(Math.max(0.05, current - 0.1));
}

export function masteryAfterTeachBack(current: number, score: number): number {
  return clamp(current + (score - 0.5) * 0.5);
}

export function daysForMastery(mastery: number): number {
  if (mastery < 0.4) return 1;
  if (mastery < 0.7) return 2;
  return 4;
}

export function scheduleReview(mastery: number, from = new Date()): string {
  const next = new Date(from);
  next.setDate(next.getDate() + daysForMastery(mastery));
  return next.toISOString();
}

export function statusFor(
  mastery: number,
  misconceptionId: string | null,
  needsReview: boolean,
): FingerprintStatus {
  if (needsReview) return 'needs_review';
  if (mastery >= MASTERED_THRESHOLD) return 'mastered';
  if (misconceptionId && mastery < 0.5) return 'unresolved';
  if (mastery >= 0.6) return 'review';
  return 'repairing';
}

export function detectMisconception(transcript: string): string | null {
  const lowered = transcript.toLowerCase();
  let best: string | null = null;
  let bestHits = 0;
  for (const [id, phrases] of Object.entries(MISCONCEPTION_LEXICON)) {
    const hits = phrases.filter((phrase) => lowered.includes(phrase.toLowerCase())).length;
    if (hits > bestHits) {
      best = id;
      bestHits = hits;
    }
  }
  return best;
}

export type ProbeOutcome = {
  correct: boolean;
  misconceptionId: string | null;
};

export function findPackConcept(pack: LessonPack, conceptId: string): PackConcept | undefined {
  return pack.concepts.find((item) => item.concept_id === conceptId);
}

export function diagnoseProbe(pack: LessonPack, conceptId: string, selectedLabel: string): ProbeOutcome {
  const target = findPackConcept(pack, conceptId);
  if (!target) return { correct: false, misconceptionId: null };
  const option = target.probe.options.find((item) => item.label === selectedLabel);
  const correct = target.probe.correct_label === selectedLabel;
  return { correct, misconceptionId: correct ? null : option?.misconception_id ?? null };
}

export type OfflineGrade = TeachBackGrade;

export function gradeTeachBack(
  pack: LessonPack,
  profileId: string,
  conceptId: string,
  transcript: string,
): OfflineGrade {
  const target = findPackConcept(pack, conceptId);
  const text = transcript.trim();
  const lowered = text.toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const keyTerms = target
    ? [...target.key_terms.map((t) => t.en.toLowerCase()), ...target.key_terms.map((t) => t.term_or)]
    : [];
  const firstTitleWord = target?.title_en.split(/\s+/)[0]?.toLowerCase() ?? '';
  const mentionsConcept = keyTerms.some((term) => lowered.includes(term.toLowerCase())) || (!!firstTitleWord && lowered.includes(firstTitleWord));
  const explainsMechanism = MECHANISM_CUES.some((cue) => lowered.includes(cue.toLowerCase()));
  const usesExample = EXAMPLE_NOUNS.some((noun) => lowered.includes(noun.toLowerCase()));

  const detected = detectMisconception(text);
  const avoidsMisconception = detected === null;

  const rubric: RubricCriterion[] = [
    { id: 'mentions_concept', met: mentionsConcept, note: mentionsConcept ? 'Names the concept or a key term.' : 'Concept not named.' },
    { id: 'explains_mechanism', met: explainsMechanism, note: explainsMechanism ? 'Gives a cause-and-effect explanation.' : 'No causal link given.' },
    { id: 'uses_local_example', met: usesExample, note: usesExample ? 'Uses a familiar local example.' : 'No local example used.' },
    { id: 'avoids_misconception', met: avoidsMisconception, note: avoidsMisconception ? 'No misconception language detected.' : 'A misconception phrase was detected.' },
  ];
  const metCount = rubric.filter((item) => item.met).length;
  const score = Math.round((metCount / rubric.length) * 1000) / 1000;

  const needsReview = wordCount < 4 || (!mentionsConcept && !explainsMechanism);
  const headMisconception = target?.intervention?.misconception_id ?? null;
  const misconceptionId = detected ?? (score < 0.5 ? headMisconception : null);

  let confidence: number;
  let feedbackOr: string;
  if (needsReview) {
    confidence = 0.3;
    feedbackOr = 'ଉତ୍ତର ଛୋଟ ଅଛି। ଦୟାକରି ଅଧିକ ବୁଝାଇ କୁହ। (Answer too short to grade confidently.)';
  } else if (score >= 0.75) {
    confidence = 0.85;
    feedbackOr = 'ଭଲ ବ୍ୟାଖ୍ୟା! ଧାରଣା ସ୍ପଷ୍ଟ ହେଉଛି। (Good explanation — the idea is clear.)';
  } else if (score >= 0.5) {
    confidence = 0.7;
    feedbackOr = 'ଆଉ ଟିକେ ଗଭୀର କର। କାରଣ ଓ ଉଦାହରଣ ଯୋଡ଼। (Add more cause and example.)';
  } else {
    confidence = 0.6;
    feedbackOr = 'ଆଉ ଥରେ ଚେଷ୍ଟା କର; ଗୋଟିଏ ଉଦାହରଣ ସହ ବୁଝାଅ। (Try again with one example.)';
  }

  return {
    profile_id: profileId,
    concept_id: conceptId,
    transcript: text,
    score,
    rubric,
    misconception_id: misconceptionId,
    confidence,
    needs_review: needsReview,
    feedback_or: feedbackOr,
    next_review_at: null,
  };
}

export type LocalState = Pick<
  Fingerprint,
  'mastery' | 'status' | 'misconception_id' | 'confidence' | 'evidence' | 'next_review_at'
>;

export function afterProbe(current: number, outcome: ProbeOutcome, existing?: Fingerprint): LocalState {
  const mastery = masteryAfterProbe(current, outcome.correct);
  const misconceptionId = outcome.correct ? null : outcome.misconceptionId;
  const evidence = [
    ...(existing?.evidence.slice(-3) ?? []),
    outcome.correct ? 'Probe answered correctly.' : 'Probe answered incorrectly.',
  ];
  return {
    mastery,
    status: statusFor(mastery, misconceptionId, false),
    misconception_id: misconceptionId,
    confidence: 0.7,
    evidence,
    next_review_at: scheduleReview(mastery),
  };
}

export function afterTeachBack(current: number, grade: OfflineGrade, existing?: Fingerprint): LocalState {
  const mastery = masteryAfterTeachBack(current, grade.score);
  const misconceptionId = grade.needs_review && existing ? existing.misconception_id ?? null : grade.misconception_id ?? null;
  return {
    mastery,
    status: statusFor(mastery, misconceptionId, grade.needs_review),
    misconception_id: misconceptionId,
    confidence: grade.confidence,
    evidence: [...(existing?.evidence.slice(-2) ?? []), `Teach-back rubric score ${grade.score.toFixed(2)}.`, grade.feedback_or],
    next_review_at: scheduleReview(mastery),
  };
}
