export type ContentKeyTerm = { en: string; or: string; gloss_or: string };

export type ContentProbeOption = {
  label: string;
  value_en: string;
  value_or: string;
  misconception_id?: string | null;
};

export type ContentProbe = {
  id: string;
  prompt_en: string;
  prompt_or: string;
  correct_label: string;
  difficulty: string;
  options: ContentProbeOption[];
};

export type ContentIntervention = {
  type: string;
  title_en: string;
  title_or: string;
  body_en: string;
  body_or: string;
  audio_kb?: number;
  prerequisite_concept_id?: string | null;
};

export type ContentConcept = {
  id: string;
  chapter_id: string;
  title_en: string;
  title_or: string;
  prerequisites: string[];
  objective_en: string;
  objective_or: string;
  explanation_en: string;
  explanation_or: string;
  local_example_or: string;
  key_terms: ContentKeyTerm[];
  text_kb: number;
  audio_kb: number;
  review_status: string;
  probes: ContentProbe[];
  teach_back_prompt_en: string;
  teach_back_prompt_or: string;
};

export type ContentMisconception = {
  id: string;
  concept_id: string;
  label_en: string;
  label_or: string;
  description_en: string;
  description_or: string;
  intervention: ContentIntervention;
  teacher_prompt_en: string;
};

export type ContentChapter = {
  id: string;
  title_en: string;
  title_or?: string;
  objective_en?: string;
  objective_or?: string;
};

export type ContentMeta = {
  subject: string;
  grade: string;
  language_primary: string;
  language_secondary: string;
  version: string;
  review_status: string;
  review_note?: string;
  citation?: string;
};

export type ContentLibrary = {
  meta: ContentMeta;
  chapters: ContentChapter[];
  concepts: ContentConcept[];
  misconceptions: ContentMisconception[];
};
