export type Profile = {
  id: string;
  name: string;
  grade: string;
  subject: string;
  language: string;
  data_budget_mb: number;
  session_minutes: number;
  misconception_map: Record<string, string>;
  last_synced_at?: string | null;
};

export type ProbeOption = {
  label: string;
  value: string;
  misconception?: string | null;
};

export type LessonPack = {
  pack_id: string;
  profile_id: string;
  concept: string;
  title: string;
  objective: string;
  explanation: string;
  probe_question: string;
  options: ProbeOption[];
  correct_answer: string;
  misconception: string;
  intervention: string;
  teach_back_prompt: string;
  budget_kb: number;
  completion_minutes: number;
  signature: string;
  trace: string[];
};

export type SyncEvent = {
  id: string;
  profile_id: string;
  type: string;
  details: Record<string, unknown>;
  created_at: string;
};

export type TeacherBrief = {
  class_name: string;
  top_misconceptions: Array<{ label: string; count: number }>;
  suggested_prompt: string;
  learners_needing_follow_up: string[];
  next_pack_focus: string;
};
