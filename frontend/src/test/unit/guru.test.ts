import { describe, expect, it } from 'vitest';

import {
  answerDoubt,
  findConceptForText,
  gradeQuizAttempt,
  startQuiz,
  teach,
  topicList,
} from '../../shared/lib/offline/guru';
import { contentLibrary, getConcept } from '../../shared/lib/offline/library';

describe('guru tutor brain', () => {
  it('answers a topic doubt with a concept, explanation and the classic mix-up', () => {
    const reply = answerDoubt('What is electric current?');
    expect(reply.intent).toBe('doubt');
    expect(reply.conceptId).toBe('electric-current');
    const kinds = reply.sections.map((section) => section.kind);
    expect(kinds).toContain('idea');
    expect(kinds).toContain('example');
    expect(kinds).toContain('confusion');
    expect(reply.answer_en.length).toBeGreaterThan(20);
    expect(reply.answer_or).toContain('ବିଦ୍ୟୁତ୍');
  });

  it('routes a misconception phrasing to the owning concept', () => {
    expect(findConceptForText('the current gets used up by the bulb')?.id).toBe('electric-current');
    expect(findConceptForText('a body needs a push to keep moving')?.id).toBe('inertia-first-law');
  });

  it('greets, thanks and helps', () => {
    expect(answerDoubt('ਨਮਸ੍ਕਾਰ').intent === 'greeting' || answerDoubt('ନମସ୍କାର').intent === 'greeting').toBe(true);
    expect(answerDoubt('thank you!').intent).toBe('thanks');
    expect(answerDoubt('what can you do?').intent).toBe('help');
  });

  it('detects Odia input and leads the answer in Odia', () => {
    const reply = answerDoubt('ଘର୍ଷଣ କଣ?');
    expect(reply.primary).toBe('or');
    expect(reply.conceptId).toBe('friction');
  });

  it('teaches an explicit concept on demand', () => {
    const reply = teach('friction');
    expect(reply.conceptId).toBe('friction');
    expect(reply.sections.length).toBeGreaterThan(0);
    expect(reply.speak_or.length).toBeGreaterThan(0);
  });

  it('runs a quiz and grades both a correct and a wrong answer', () => {
    const quiz = startQuiz('ohm-law');
    expect(quiz.quiz).toBeDefined();
    const probe = getConcept('ohm-law')!.probes[0];
    expect(quiz.quiz!.options).toHaveLength(probe.options.length);

    const good = gradeQuizAttempt('ohm-law', probe.correct_label);
    expect(good.answer_en).toContain('Correct');

    const wrongLabel = probe.options.find((option) => option.label !== probe.correct_label)!.label;
    const bad = gradeQuizAttempt('ohm-law', wrongLabel);
    expect(bad.answer_en).toContain('Not quite');
  });

  it('is deterministic and offers the full syllabus', () => {
    const first = JSON.stringify(answerDoubt('what is acceleration'));
    const second = answerDoubt('what is acceleration');
    expect(JSON.stringify(second)).toBe(first);
    expect(topicList()).toHaveLength(contentLibrary.concepts.length);
  });
});
