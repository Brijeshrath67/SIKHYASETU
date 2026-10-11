import { useCallback, useEffect, useRef, useState } from 'react';

export type SpeakLang = 'or' | 'en';

const VOICE_PREFERENCES: Record<SpeakLang, string[]> = {
  or: ['or', 'or-IN', 'hi', 'hi-IN'],
  en: ['en-IN', 'en-GB', 'en-US', 'en'],
};

function pickVoice(voices: SpeechSynthesisVoice[], lang: SpeakLang): SpeechSynthesisVoice | undefined {
  for (const prefix of VOICE_PREFERENCES[lang]) {
    const match = voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix.toLowerCase()));
    if (match) return match;
  }
  return voices[0];
}

/**
 * Browser-native text-to-speech. Odia uses the closest installed voice and
 * gracefully falls back, so the tutor can "speak" with zero API cost.
 */
export function useSpeech() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [enabled, setEnabled] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!supported) return;
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, [supported]);

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string, lang: SpeakLang = 'or') => {
      if (!supported || !text.trim()) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = pickVoice(voicesRef.current, lang);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = lang === 'or' ? 'or-IN' : 'en-IN';
      }
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [supported],
  );

  return { supported, enabled, setEnabled, speaking, speak, cancel };
}
