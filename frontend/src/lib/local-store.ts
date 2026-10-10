import type { LessonPack, Profile, SyncEvent } from '../types';

export const STORAGE_KEYS = {
  profiles: 'sikhyasetu.profiles',
  queuedEvents: 'sikhyasetu.sync.queue',
};

export const defaultProfiles: Profile[] = [
  {
    id: 'sunita',
    name: 'Sunita',
    grade: 'Class 9',
    subject: 'Science',
    language: 'Odia',
    data_budget_mb: 0.8,
    session_minutes: 25,
    misconception_map: { concept: 'Current and Resistance', misconception: 'current gets used up' },
  },
  {
    id: 'asha',
    name: 'Asha',
    grade: 'Class 9',
    subject: 'Science',
    language: 'Odia',
    data_budget_mb: 1.2,
    session_minutes: 30,
    misconception_map: { concept: 'Force and Motion', misconception: 'force is contained in the object' },
  },
];

export function loadProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.profiles);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(defaultProfiles));
      return defaultProfiles;
    }
    const parsed = JSON.parse(raw) as Profile[];
    return parsed.length ? parsed : defaultProfiles;
  } catch {
    return defaultProfiles;
  }
}

export function saveProfiles(profiles: Profile[]) {
  localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(profiles));
}

export function loadQueuedEvents(): SyncEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.queuedEvents);
    return raw ? (JSON.parse(raw) as SyncEvent[]) : [];
  } catch {
    return [];
  }
}

export function saveQueuedEvents(events: SyncEvent[]) {
  localStorage.setItem(STORAGE_KEYS.queuedEvents, JSON.stringify(events));
}

export function makeEventId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function makeLocalPack(profileId: string): LessonPack {
  const conceptMap: Record<string, LessonPack> = {
    sunita: {
      pack_id: 'sunita-current-and-resistance',
      profile_id: profileId,
      concept: 'Current and Resistance',
      title: 'Current and Resistance repair pack',
      objective: 'Differentiate current flow from energy consumption in a simple circuit.',
      explanation:
        'Current is the flow of charge around a loop. In a series circuit, the same current passes through each component; brightness changes because the total resistance changes.',
      probe_question: 'Two bulbs are connected in series. What happens to the current when one bulb is removed?',
      options: [
        { label: 'A', value: 'The current gets used up in the first bulb.', misconception: 'current gets used up' },
        { label: 'B', value: 'The current is the same through the loop, but the circuit changes.', misconception: null },
        { label: 'C', value: 'The battery stops making current after the first bulb.', misconception: 'battery runs out of current' },
      ],
      correct_answer: 'B',
      misconception: 'current gets used up',
      intervention:
        'Use the two-bulb comparison prompt: ask learners to explain where the brightness changes and whether current is created or used up.',
      teach_back_prompt: 'Describe in your own words why the brightness changes when another bulb is added to the circuit.',
      budget_kb: 290,
      completion_minutes: 15,
      signature: 'sig-sunita-current-and-resistance',
      trace: ['event received', 'local diagnosis', 'budget checked', 'pack compiled'],
    },
    asha: {
      pack_id: 'asha-force-and-motion',
      profile_id: profileId,
      concept: 'Force and Motion',
      title: 'Force and Motion repair pack',
      objective: 'Explain why a moving bicycle slows when brakes act on it.',
      explanation:
        'A force is an interaction between objects, not a thing stored inside the bicycle. When the brakes act, friction opposes motion and slows the rider.',
      probe_question: 'A bicycle moves forward. Which statement best explains why it slows when the brakes are applied?',
      options: [
        { label: 'A', value: 'The bicycle is using up its stored force.', misconception: 'force is contained in the object' },
        { label: 'B', value: 'Friction from the brakes acts against the motion.', misconception: null },
        { label: 'C', value: 'The rider stops pushing the bicycle.', misconception: 'motion is maintained only by pushing' },
      ],
      correct_answer: 'B',
      misconception: 'force is contained in the object',
      intervention:
        'Counter-example: a bicycle slows even when the rider keeps pedalling. Friction and braking force are external interactions, not an internal fuel.',
      teach_back_prompt: 'Explain in Odia why the bicycle slows down when the brakes are applied.',
      budget_kb: 260,
      completion_minutes: 12,
      signature: 'sig-asha-force-and-motion',
      trace: ['event received', 'local diagnosis', 'budget checked', 'pack compiled'],
    },
  };

  return conceptMap[profileId] ?? conceptMap.sunita;
}
