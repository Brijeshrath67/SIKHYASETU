export type Profile = {
  id: string;
  name: string;
  grade: string;
  subject: string;
  language: string;
  data_budget_mb: number;
  session_minutes: number;
  consent_identification: boolean;
  last_synced_at?: string | null;
};

export type KeyTerm = {
  en: string;
  term_or: string;
  gloss_or: string;
};

export type ProbeOption = {
  label: string;
  value_en: string;
  value_or: string;
  misconception_id?: string | null;
};

export type Probe = {
  probe_id: string;
  concept_id: string;
  prompt_en: string;
  prompt_or: string;
  correct_label: string;
  difficulty: string;
  misconception_id?: string | null;
  options: ProbeOption[];
};

export type Intervention = {
  misconception_id: string;
  type: string;
  title_en: string;
  title_or: string;
  body_en: string;
  body_or: string;
  prerequisite_concept_id?: string | null;
};

export type AudioRef = {
  available: boolean;
  kb: number;
};

export type PackConcept = {
  concept_id: string;
  title_en: string;
  title_or: string;
  objective_en: string;
  objective_or: string;
  explanation_en: string;
  explanation_or: string;
  local_example_or: string;
  key_terms: KeyTerm[];
  audio: AudioRef;
  probe: Probe;
  intervention?: Intervention | null;
  teach_back_prompt_en: string;
  teach_back_prompt_or: string;
};

export type PackBudget = {
  data_budget_kb: number;
  session_minutes: number;
  estimated_kb: number;
  estimated_minutes: number;
  fits: boolean;
  audio_included: boolean;
  decisions: string[];
};

export type PackProvenance = {
  source: 'cloud' | 'seed' | 'fallback';
  fallback: boolean;
  notes: string[];
};

export type PackIntegrity = {
  algorithm: string;
  checksum: string;
};

export type LessonPack = {
  pack_id: string;
  pack_version: string;
  profile_id: string;
  generated_at: string;
  primary_language: string;
  secondary_language: string;
  reading_level: string;
  objectives: string[];
  concepts: PackConcept[];
  budget: PackBudget;
  provenance: PackProvenance;
  integrity: PackIntegrity;
  trace: string[];
};

export type RecommendedIntervention = {
  type: string;
  title_en: string;
  title_or: string;
  body_en: string;
  body_or: string;
};

export type FingerprintStatus =
  | 'unresolved'
  | 'repairing'
  | 'review'
  | 'mastered'
  | 'needs_review';

export type Fingerprint = {
  profile_id: string;
  concept_id: string;
  concept_title_or: string;
  mastery: number;
  status: FingerprintStatus;
  misconception_id?: string | null;
  misconception_label_en?: string | null;
  misconception_label_or?: string | null;
  confidence: number;
  evidence: string[];
  recommended_intervention?: RecommendedIntervention | null;
  next_review_at?: string | null;
  updated_at?: string | null;
};

export type RubricCriterion = {
  id: string;
  met: boolean;
  note: string;
};

export type TeachBackGrade = {
  profile_id: string;
  concept_id: string;
  transcript: string;
  score: number;
  rubric: RubricCriterion[];
  misconception_id?: string | null;
  confidence: number;
  needs_review: boolean;
  feedback_or: string;
  next_review_at?: string | null;
  fingerprint?: Fingerprint | null;
};

export type MisconceptionCluster = {
  misconception_id?: string | null;
  label_en: string;
  label_or: string;
  concept_id?: string | null;
  affected_learners: number;
  bucket: string;
};

export type BriefIntervention = {
  misconception_id?: string | null;
  prompt_en: string;
  prompt_or: string;
};

export type NextPackFocus = {
  profile_id: string;
  concept_id: string;
  concept_title_or: string;
  reason: string;
};

export type TeacherActionBrief = {
  class_name: string;
  generated_at: string;
  totals: Record<string, number>;
  top_misconceptions: MisconceptionCluster[];
  suggested_intervention?: BriefIntervention | null;
  learners_needing_follow_up: string[];
  next_pack_focus: NextPackFocus[];
};

export type TraceNode = {
  name: string;
  status: 'ok' | 'skipped' | 'fallback' | 'error';
  summary: string;
  details: Record<string, unknown>;
};

export type AgentTrace = {
  run_id: string;
  profile_id: string;
  trigger: string;
  started_at: string;
  finished_at?: string | null;
  nodes: TraceNode[];
  decision: Record<string, unknown>;
};

export type SyncResult = {
  accepted: number;
  duplicates: number;
  rejected: number;
  event_ids: string[];
  affected_profiles: string[];
  runs: AgentTrace[];
  next_pack_ids: Record<string, string>;
};
