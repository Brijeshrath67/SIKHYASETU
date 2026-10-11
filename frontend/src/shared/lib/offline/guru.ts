/**
 * The offline "Guru" tutor brain.
 *
 * There is no model call: the tutor is a deterministic retrieval + template
 * engine over the authored bilingual curriculum. Given a learner's doubt it
 * finds the most relevant concept, explains it, flags the classic mix-up, and
 * can quiz the learner — all with zero network and zero cost.
 */

import {
  ODIA_RANGE,
  contentLibrary,
  getConcept,
  getMisconception,
  misconceptionForConcept,
} from './library';
import { detectMisconception } from './tutor';
import type { ContentConcept, ContentMisconception, ContentProbe } from '../../types/content';

export type Lang = 'or' | 'en';

export type GuruSection = {
  kind: 'idea' | 'terms' | 'example' | 'confusion' | 'related' | 'steps';
  title_en: string;
  title_or: string;
  body_en: string;
  body_or: string;
};

export type GuruQuizOption = { label: string; en: string; or: string };

export type GuruQuiz = {
  conceptId: string;
  probeId: string;
  prompt_en: string;
  prompt_or: string;
  options: GuruQuizOption[];
};

export type GuruReply = {
  intent: 'greeting' | 'thanks' | 'help' | 'doubt' | 'topic' | 'quiz' | 'unknown';
  conceptId: string | null;
  primary: Lang;
  answer_en: string;
  answer_or: string;
  sections: GuruSection[];
  suggestions: { en: string; or: string }[];
  speak_en: string;
  speak_or: string;
  quiz?: GuruQuiz;
};

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'what', 'why', 'how', 'does', 'do', 'and', 'or', 'to', 'of',
  'in', 'on', 'for', 'with', 'this', 'that', 'it', 'i', 'me', 'my', 'you', 'your', 'can', 'could',
  'please', 'explain', 'tell', 'about', 'help', 'doubt', 'thing', 'means', 'mean', 'when', 'where',
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 2);
}

function keywordTokens(text: string): string[] {
  return tokens(text).filter((token) => !STOPWORDS.has(token));
}

function detectIntent(lowered: string): GuruReply['intent'] | null {
  if (/^(hi|hello|hey|namaskar|ନମସ୍କାର|ହାଲୋ|ଜୟ ଜଗନ୍ନାଥ)\b/.test(lowered) || /namaskar|ନମସ୍କାର/.test(lowered)) {
    return 'greeting';
  }
  if (/thank|thanks|ଧନ୍ୟବାଦ/.test(lowered)) return 'thanks';
  if (/what can you|how do you|who are you|help me|ସାହାଯ୍ୟ|କଣ କରିପାର/.test(lowered)) return 'help';
  if (/quiz me|test me|ask me a question|ପରୀକ୍ଷା କର|ପ୍ରଶ୍ନ କର/.test(lowered)) return 'quiz';
  return null;
}

function scoreConcept(concept: ContentConcept, lowered: string, words: string[]): number {
  let score = 0;
  if (lowered.includes(concept.title_or)) score += 8;
  for (const word of concept.title_en.toLowerCase().split(/\s+/)) {
    if (word.length >= 4 && lowered.includes(word)) score += 4;
  }
  for (const term of concept.key_terms) {
    if (lowered.includes(term.en.toLowerCase())) score += 3;
    if (lowered.includes(term.or)) score += 4;
    if (lowered.includes(term.gloss_or)) score += 2;
  }
  const explanationWords = new Set(keywordTokens(concept.explanation_en));
  for (const word of words) {
    if (explanationWords.has(word)) score += 1;
  }
  if (lowered.includes(concept.objective_en.toLowerCase().slice(0, 24))) score += 2;
  return score;
}

export function findConceptForText(text: string): ContentConcept | null {
  const lowered = text.toLowerCase();
  const words = keywordTokens(text);

  const misconceptionId = detectMisconception(text);
  const direct = misconceptionId ? getMisconception(misconceptionId)?.concept_id : undefined;

  let best: ContentConcept | null = null;
  let bestScore = 0;
  for (const concept of contentLibrary.concepts) {
    let score = scoreConcept(concept, lowered, words);
    if (direct && concept.id === direct) score += 8;
    if (score > bestScore) {
      best = concept;
      bestScore = score;
    }
  }
  return bestScore >= 3 ? best : null;
}

function relatedSection(concept: ContentConcept): GuruSection | null {
  const prereqs = concept.prerequisites
    .map((id) => getConcept(id))
    .filter((item): item is ContentConcept => Boolean(item));
  const next = contentLibrary.concepts.find(
    (item) => item.chapter_id === concept.chapter_id && item.prerequisites.includes(concept.id),
  );
  if (prereqs.length === 0 && !next) return null;
  const partsEn: string[] = [];
  const partsOr: string[] = [];
  if (prereqs.length) {
    partsEn.push(`Builds on: ${prereqs.map((p) => p.title_en).join(', ')}.`);
    partsOr.push(`ଏହା ଉପରେ ଆଧାରିତ: ${prereqs.map((p) => p.title_or).join(', ')}।`);
  }
  if (next) {
    partsEn.push(`Leads to: ${next.title_en}.`);
    partsOr.push(`ପରବର୍ତ୍ତୀ: ${next.title_or}।`);
  }
  return {
    kind: 'related',
    title_en: 'Where this fits',
    title_or: 'ଏହା କେଉଁଠି ବସିଛି',
    body_en: partsEn.join(' '),
    body_or: partsOr.join(' '),
  };
}

function confusionSection(concept: ContentConcept): GuruSection | null {
  const misconception: ContentMisconception | undefined = misconceptionForConcept(concept.id);
  if (!misconception) return null;
  return {
    kind: 'confusion',
    title_en: `Common mix-up: ${misconception.label_en}`,
    title_or: `ସାଧାରଣ ଭୁଲ୍: ${misconception.label_or}`,
    body_en: `${misconception.description_en} Fix it: ${misconception.intervention.body_en}`,
    body_or: `${misconception.description_or} ସମାଧାନ: ${misconception.intervention.body_or}`,
  };
}

function sectionsFor(concept: ContentConcept): GuruSection[] {
  const sections: GuruSection[] = [
    {
      kind: 'idea',
      title_en: 'The big idea',
      title_or: 'ମୂଳ ଧାରଣା',
      body_en: concept.objective_en,
      body_or: concept.objective_or,
    },
    {
      kind: 'terms',
      title_en: 'Words to know',
      title_or: 'ଜାଣିବା ଶବ୍ଦ',
      body_en: concept.key_terms.map((term) => `${term.en} (${term.gloss_or})`).join(' · '),
      body_or: concept.key_terms.map((term) => `${term.or} — ${term.gloss_or}`).join(' · '),
    },
    {
      kind: 'example',
      title_en: 'A local example',
      title_or: 'ଆମ ଆଖପାଖ ଉଦାହରଣ',
      body_en: concept.local_example_or,
      body_or: concept.local_example_or,
    },
  ];
  const confusion = confusionSection(concept);
  if (confusion) sections.push(confusion);
  const related = relatedSection(concept);
  if (related) sections.push(related);
  return sections;
}

function topicSuggestions(concept: ContentConcept): { en: string; or: string }[] {
  return [
    { en: `Give me an example of ${concept.title_en}`, or: `${concept.title_or} ର ଏକ ଉଦାହରଣ ଦିଅ` },
    { en: 'Why do people get this wrong?', or: 'ଲୋକେ ଏଠି କାହିଁକି ଭୁଲ୍ କରନ୍ତି?' },
    { en: 'Quiz me on this', or: 'ଏହା ଉପରେ ମୋତେ ପରୀକ୍ଷା କର' },
    { en: 'What should I learn next?', or: 'ପରେ ମୁଁ କଣ ଶିଖିବି?' },
  ];
}

function teachConcept(concept: ContentConcept, primary: Lang, opener?: GuruReply['intent']): GuruReply {
  const sections = sectionsFor(concept);
  const answer_en =
    opener === 'greeting'
      ? `Namaskar! Let's understand ${concept.title_en}. ${concept.explanation_en}`
      : `Good question. Let's unpack ${concept.title_en}. ${concept.explanation_en}`;
  const answer_or = opener === 'greeting'
    ? `ନମସ୍କାର! ଚାଲ ${concept.title_or} ବୁଝିବା। ${concept.explanation_or}`
    : `ଭଲ ପ୍ରଶ୍ନ। ଚାଲ ${concept.title_or} ବୁଝିବା। ${concept.explanation_or}`;

  return {
    intent: 'doubt',
    conceptId: concept.id,
    primary,
    answer_en,
    answer_or,
    sections,
    suggestions: topicSuggestions(concept),
    speak_or: `${answer_or} ${sections.map((s) => s.body_or).join(' ')}`,
    speak_en: `${answer_en} ${sections.map((s) => s.body_en).join(' ')}`,
  };
}

export function answerDoubt(text: string, contextConceptId?: string | null): GuruReply {
  const lowered = text.toLowerCase();
  const primary: Lang = ODIA_RANGE.test(text) ? 'or' : 'en';

  const intent = detectIntent(lowered);
  if (intent === 'greeting') {
    const concept = contextConceptId ? getConcept(contextConceptId) : null;
    if (concept) return teachConcept(concept, primary, 'greeting');
    const first = contentLibrary.concepts[0];
    return {
      intent: 'greeting',
      conceptId: first.id,
      primary,
      answer_en: 'Namaskar! I am Guru, your offline science teacher. Ask me about any Class 9 topic.',
      answer_or: 'ନମସ୍କାର! ମୁଁ ଗୁରୁ, ତୁମର ଅଫଲାଇନ ବିଜ୍ଞାନ ଶିକ୍ଷକ। ଯେକୌଣସି ପ୍ରସଙ୍ଗ ପଚାର।',
      sections: [],
      suggestions: [
        { en: 'Explain electric current', or: 'ବିଦ୍ୟୁତ୍ ପ୍ରବାହ ବୁଝାଅ' },
        { en: 'What is force?', or: 'ବଳ କଣ?' },
        { en: 'Quiz me', or: 'ମୋତେ ପରୀକ୍ଷା କର' },
      ],
      speak_or: 'ନମସ୍କାର! ମୁଁ ଗୁରୁ, ତୁମର ଅଫଲାଇନ ବିଜ୍ଞାନ ଶିକ୍ଷକ।',
      speak_en: 'Namaskar! I am Guru, your offline science teacher.',
    };
  }

  if (intent === 'thanks') {
    return {
      intent: 'thanks',
      conceptId: contextConceptId ?? null,
      primary,
      answer_en: 'Anytime! Keep asking — doubts are how we learn.',
      answer_or: 'ଯେକୌଣସି ସମୟରେ! ପଚାରିବା ଜାରି ରଖ — ସନ୍ଦେହ ହିଁ ଶିକ୍ଷା।',
      sections: [],
      suggestions: topicSuggestions(contentLibrary.concepts[0]),
      speak_or: 'ଧନ୍ୟବାଦ! ପଚାରିବା ଜାରି ରଖ।',
      speak_en: 'Anytime! Keep asking.',
    };
  }

  if (intent === 'help') {
    return {
      intent: 'help',
      conceptId: null,
      primary,
      answer_en:
        'I can explain any topic in your Class 9 Science book, give local examples, name the classic misconception, and quiz you. Ask in Odia or English.',
      answer_or:
        'ମୁଁ ତୁମ ଶ୍ରେଣୀ ୯ ବିଜ୍ଞାନ ପୁସ୍ତକର ଯେକୌଣସି ବିଷୟ ବୁଝାଇପାରେ, ଉଦାହରଣ ଦେଇପାରେ, ସାଧାରଣ ଭୁଲ୍ କହିପାରେ ଓ ପରୀକ୍ଷା କରିପାରେ। ଓଡ଼ିଆ କିମ୍ବା ଇଂରାଜୀରେ ପଚାର।',
      sections: [],
      suggestions: contentLibrary.concepts.slice(0, 4).map((c) => ({ en: c.title_en, or: c.title_or })),
      speak_or: 'ମୁଁ ଯେକୌଣସି ବିଷୟ ବୁଝାଇପାରେ। ଓଡ଼ିଆ କିମ୍ବା ଇଂରାଜୀରେ ପଚାର।',
      speak_en: 'I can explain any topic. Ask in Odia or English.',
    };
  }

  // Quiz request: use the context concept, else the best match, else the first.
  if (intent === 'quiz') {
    const target =
      (contextConceptId ? getConcept(contextConceptId) : null) ?? findConceptForText(text) ?? contentLibrary.concepts[0];
    return startQuiz(target.id, primary);
  }

  const matched = findConceptForText(text) ?? (contextConceptId ? getConcept(contextConceptId) : null);

  if (!matched) {
    return {
      intent: 'unknown',
      conceptId: null,
      primary,
      answer_en:
        "I'm not sure which topic that is. Try naming it, for example “electric current” or “friction”.",
      answer_or: 'ଏହା କେଉଁ ବିଷୟ ମୁଁ ନିଶ୍ଚିତ ନୁହେଁ। ନାମ କୁହ, ଯେପରି “ବିଦ୍ୟୁତ୍ ପ୍ରବାହ” କିମ୍ବା “ଘର୍ଷଣ”।',
      sections: [],
      suggestions: contentLibrary.concepts.slice(0, 6).map((c) => ({ en: c.title_en, or: c.title_or })),
      speak_or: 'ଏହା କେଉଁ ବିଷୟ ମୁଁ ନିଶ୍ଚିତ ନୁହେଁ। ନାମ କୁହ।',
      speak_en: "I'm not sure which topic that is. Try naming it.",
    };
  }

  return teachConcept(matched, primary);
}

export function startQuiz(conceptId: string, primary: Lang = 'or'): GuruReply {
  const concept = getConcept(conceptId) ?? contentLibrary.concepts[0];
  const probe: ContentProbe | undefined = concept.probes[0];
  if (!probe) {
    return teachConcept(concept, primary);
  }
  return {
    intent: 'quiz',
    conceptId: concept.id,
    primary,
    answer_en: `Let's check your understanding of ${concept.title_en}.`,
    answer_or: `ଚାଲ ${concept.title_or} ତୁମେ ବୁଝିଛ କି ନାହିଁ ଦେଖିବା।`,
    sections: [],
    suggestions: [],
    speak_or: probe.prompt_or,
    speak_en: probe.prompt_en,
    quiz: {
      conceptId: concept.id,
      probeId: probe.id,
      prompt_en: probe.prompt_en,
      prompt_or: probe.prompt_or,
      options: probe.options.map((option) => ({ label: option.label, en: option.value_en, or: option.value_or })),
    },
  };
}

/** Grade a quiz answer given a label ("A") or free text matching an option. */
export function gradeQuizAttempt(conceptId: string, answer: string, primary: Lang = 'or'): GuruReply {
  const concept = getConcept(conceptId) ?? contentLibrary.concepts[0];
  const probe = concept.probes[0];
  if (!probe) return teachConcept(concept, primary);

  const lowered = answer.trim().toLowerCase();
  const byLabel = probe.options.find((option) => option.label.toLowerCase() === lowered);
  const byText = probe.options.find(
    (option) => lowered.includes(option.value_en.toLowerCase()) || lowered.includes(option.value_or),
  );
  const chosen = byLabel ?? byText;
  const correct = chosen ? chosen.label === probe.correct_label : false;

  if (correct) {
    return {
      intent: 'quiz',
      conceptId: concept.id,
      primary,
      answer_en: `Correct! ${concept.explanation_en}`,
      answer_or: `ଠିକ୍! ${concept.explanation_or}`,
      sections: confusionSection(concept) ? [confusionSection(concept)!] : [],
      suggestions: topicSuggestions(concept),
      speak_or: `ଠିକ୍ ଉତ୍ତର! ${concept.explanation_or}`,
      speak_en: `Correct! ${concept.explanation_en}`,
    };
  }

  const misconception = chosen?.misconception_id ? getMisconception(chosen.misconception_id) : undefined;
  const sections: GuruSection[] = [];
  if (misconception) {
    sections.push({
      kind: 'confusion',
      title_en: `That's a common one — ${misconception.label_en}`,
      title_or: `ଏହା ସାଧାରଣ ଭୁଲ୍ — ${misconception.label_or}`,
      body_en: `${misconception.description_en} Fix it: ${misconception.intervention.body_en}`,
      body_or: `${misconception.description_or} ସମାଧାନ: ${misconception.intervention.body_or}`,
    });
  }
  return {
    intent: 'quiz',
    conceptId: concept.id,
    primary,
    answer_en: `Not quite. ${concept.explanation_en}`,
    answer_or: `ପୂର୍ଣ୍ଣ ଠିକ୍ ନୁହେଁ। ${concept.explanation_or}`,
    sections,
    suggestions: topicSuggestions(concept),
    speak_or: `ପୂର୍ଣ୍ଣ ଠିକ୍ ନୁହେଁ। ${concept.explanation_or}`,
    speak_en: `Not quite. ${concept.explanation_en}`,
  };
}

export function topicList(): { id: string; en: string; or: string }[] {
  return contentLibrary.concepts.map((concept) => ({ id: concept.id, en: concept.title_en, or: concept.title_or }));
}

/** Directly teach a known concept (used when the learner taps "Ask Guru"). */
export function teach(conceptId: string, primary: Lang = 'or'): GuruReply {
  const concept = getConcept(conceptId) ?? contentLibrary.concepts[0];
  return teachConcept(concept, primary, 'greeting');
}
