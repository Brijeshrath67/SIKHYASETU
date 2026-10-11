import { describe, expect, it } from 'vitest';

import {
  BASE_MASTERY,
  afterProbe,
  afterTeachBack,
  detectMisconception,
  diagnoseProbe,
  gradeTeachBack,
  masteryAfterProbe,
  masteryAfterTeachBack,
  scheduleReview,
  statusFor,
} from '../../shared/lib/offline/tutor';
import seedRaw from '../../shared/content/seed-packs.json';
import type { LessonPack } from '../../shared/types/domain';

const bundle = seedRaw as unknown as { packs: Record<string, LessonPack> };
const sunitaPack = bundle.packs.sunita;

describe('mastery transitions', () => {
  it('rises on a correct probe and falls (with a floor) on a wrong one', () => {
    expect(masteryAfterProbe(0.5, true)).toBe(0.8);
    expect(masteryAfterProbe(0.5, false)).toBe(0.4);
    expect(masteryAfterProbe(0.05, false)).toBe(0.05);
  });

  it('centers teach-back adjustment on a 0.5 score', () => {
    expect(masteryAfterTeachBack(0.4, 0.5)).toBe(0.4);
    expect(masteryAfterTeachBack(0.4, 1)).toBe(0.65);
  });

  it('maps status by mastery, misconception and review flag', () => {
    expect(statusFor(0.9, null, false)).toBe('mastered');
    expect(statusFor(0.3, 'current-gets-used-up', false)).toBe('unresolved');
    expect(statusFor(0.9, null, true)).toBe('needs_review');
  });

  it('schedules wider revision as mastery grows', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    expect(scheduleReview(0.2, from)).toContain('2026-01-02');
    expect(scheduleReview(0.9, from)).toContain('2026-01-05');
  });
});

describe('probe diagnosis', () => {
  it('flags the distractor misconception on a wrong answer', () => {
    const probe = sunitaPack.concepts[0].probe;
    const wrong = probe.options.find((option) => option.label !== probe.correct_label)!;
    const outcome = diagnoseProbe(sunitaPack, probe.concept_id, wrong.label);
    expect(outcome.correct).toBe(false);
    expect(outcome.misconceptionId).toBe(wrong.misconception_id);
  });

  it('clears the misconception on a correct answer', () => {
    const probe = sunitaPack.concepts[0].probe;
    const outcome = diagnoseProbe(sunitaPack, probe.concept_id, probe.correct_label);
    expect(outcome.correct).toBe(true);
    expect(outcome.misconceptionId).toBeNull();
  });
});

describe('teach-back grading', () => {
  it('detects misconception phrases', () => {
    expect(detectMisconception('Current is used up in the bulb.')).toBe('current-gets-used-up');
    expect(detectMisconception('Energy is converted to heat.')).toBeNull();
  });

  it('rewards a causal, example-backed explanation', () => {
    const conceptId = sunitaPack.concepts[0].concept_id;
    const grade = gradeTeachBack(
      sunitaPack,
      'sunita',
      conceptId,
      'Current flows because the wire carries charge, just like water in a pipe.',
    );
    expect(grade.score).toBeGreaterThanOrEqual(0.75);
    expect(grade.needs_review).toBe(false);
  });

  it('flags a too-short answer for teacher review', () => {
    const grade = gradeTeachBack(sunitaPack, 'sunita', sunitaPack.concepts[0].concept_id, 'hmm');
    expect(grade.needs_review).toBe(true);
    expect(grade.confidence).toBeLessThan(0.5);
  });
});

describe('local state assembly', () => {
  it('produces a lower mastery after a wrong probe than a correct one', () => {
    const probe = sunitaPack.concepts[0].probe;
    const correct = afterProbe(BASE_MASTERY, { correct: true, misconceptionId: null });
    const wrong = afterProbe(BASE_MASTERY, { correct: false, misconceptionId: probe.options[0].misconception_id ?? 'x' });
    expect(wrong.mastery).toBeLessThan(correct.mastery);
    expect(wrong.misconception_id).not.toBeNull();
  });

  it('promotes master on a strong teach-back', () => {
    const grade = gradeTeachBack(
      sunitaPack,
      'sunita',
      sunitaPack.concepts[0].concept_id,
      'Current is conserved because charge cannot be destroyed, like water in a closed pipe.',
    );
    const state = afterTeachBack(0.6, grade);
    expect(['review', 'mastered']).toContain(state.status);
  });
});
