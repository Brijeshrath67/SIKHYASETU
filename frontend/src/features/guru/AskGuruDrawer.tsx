import { useEffect, useMemo, useRef, useState } from 'react';
import { GuruAvatar } from './GuruAvatar';
import { useGuru } from './GuruProvider';
import { useSpeech } from '../../shared/hooks/useSpeech';
import { getConcept } from '../../shared/lib/offline/library';
import {
  answerDoubt,
  gradeQuizAttempt,
  startQuiz,
  teach,
  topicList,
  type GuruQuiz,
  type GuruReply,
} from '../../shared/lib/offline/guru';

type ChatMessage = {
  id: string;
  role: 'user' | 'guru';
  text?: string;
  reply?: GuruReply;
};

let seq = 0;
const nextId = () => `guru-${Date.now()}-${seq++}`;

export function AskGuruDrawer() {
  const { isOpen, activeConceptId, closeGuru } = useGuru();
  const speech = useSpeech();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<GuruQuiz | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seededFor = useRef<string | null>(null);

  const conceptTitle = useMemo(
    () => (activeConceptId ? getConcept(activeConceptId)?.title_or ?? null : null),
    [activeConceptId],
  );

  useEffect(() => {
    if (!isOpen) return;
    const key = activeConceptId ?? '__none__';
    if (seededFor.current === key && messages.length > 0) return;
    seededFor.current = key;
    const greeting = activeConceptId ? teach(activeConceptId) : answerDoubt('namaskar');
    setMessages([{ id: nextId(), role: 'guru', reply: greeting }]);
    setActiveQuiz(null);
    if (speech.enabled) speech.speak(greeting.primary === 'or' ? greeting.speak_or : greeting.speak_en, greeting.primary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeConceptId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeGuru();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closeGuru]);

  const pushReply = (reply: GuruReply) => {
    setMessages((prev) => [...prev, { id: nextId(), role: 'guru', reply }]);
    setActiveQuiz(reply.quiz ?? null);
    if (speech.enabled) {
      speech.speak(reply.primary === 'or' ? reply.speak_or : reply.speak_en, reply.primary);
    }
  };

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: trimmed }]);
    setInput('');
    setThinking(true);
    window.setTimeout(() => {
      const reply = answerDoubt(trimmed, activeConceptId);
      setThinking(false);
      pushReply(reply);
    }, 340);
  };

  const chooseQuizOption = (label: string, text: string) => {
    if (!activeQuiz) return;
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text }]);
    setThinking(true);
    const conceptId = activeQuiz.conceptId;
    setActiveQuiz(null);
    window.setTimeout(() => {
      setThinking(false);
      pushReply(gradeQuizAttempt(conceptId, label));
    }, 340);
  };

  if (!isOpen) return null;

  return (
    <div className="guru-overlay" onClick={closeGuru}>
      <aside className="guru-drawer" onClick={(event) => event.stopPropagation()} aria-label="Guru tutor">
        <header className="guru-drawer__head">
          <GuruAvatar
            size={54}
            speaking={speech.speaking}
            mood={thinking ? 'think' : speech.speaking ? 'happy' : 'idle'}
          />
          <div className="guru-drawer__id">
            <strong>Guru</strong>
            <span>{conceptTitle ? `Teaching: ${conceptTitle}` : 'Your offline science teacher'}</span>
          </div>
          <div className="guru-drawer__actions">
            {speech.supported && (
              <button
                type="button"
                className={`icon-btn ${speech.enabled ? 'is-on' : ''}`}
                title={speech.enabled ? 'Voice on' : 'Voice off'}
                onClick={() => {
                  const next = !speech.enabled;
                  speech.setEnabled(next);
                  if (!next) speech.cancel();
                }}
              >
                {speech.enabled ? '🔊' : '🔇'}
              </button>
            )}
            <button type="button" className="icon-btn" title="Close" onClick={closeGuru}>
              ✕
            </button>
          </div>
        </header>

        <div className="guru-chat" ref={scrollRef}>
          {messages.map((message) =>
            message.role === 'user' ? (
              <div key={message.id} className="guru-msg guru-msg--user">
                {message.text}
              </div>
            ) : (
              <GuruBubble
                key={message.id}
                reply={message.reply!}
                speaking={speech.speaking}
                onSpeak={() => speech.speak(message.reply!.primary === 'or' ? message.reply!.speak_or : message.reply!.speak_en, message.reply!.primary)}
                onSuggestion={send}
              />
            ),
          )}

          {activeQuiz && (
            <div className="guru-quiz">
              <p className="guru-quiz__prompt">
                <span className="or">{activeQuiz.prompt_or}</span>
                <span className="en">{activeQuiz.prompt_en}</span>
              </p>
              <div className="guru-quiz__options">
                {activeQuiz.options.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    className="guru-quiz__option"
                    onClick={() => chooseQuizOption(option.label, `${option.label}. ${option.en}`)}
                  >
                    <span className="badge">{option.label}</span>
                    <span>
                      <span className="or">{option.or}</span>
                      <span className="en">{option.en}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {thinking && (
            <div className="guru-msg guru-msg--typing">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          )}

          {messages.length <= 1 && !thinking && (
            <div className="guru-topics">
              {topicList().map((topic) => (
                <button key={topic.id} type="button" className="chip" onClick={() => send(topic.en)}>
                  {topic.or}
                </button>
              ))}
            </div>
          )}
        </div>

        <form
          className="guru-input"
          onSubmit={(event) => {
            event.preventDefault();
            send(input);
          }}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="ଓଡ଼ିଆ କିମ୍ବା English ରେ ସନ୍ଦେହ ପଚାର…"
            aria-label="Ask Guru a doubt"
          />
          {activeConceptId && (
            <button
              type="button"
              className="ghost-btn"
              title="Start a quiz on this topic"
              onClick={() => pushReply(startQuiz(activeConceptId))}
            >
              Quiz
            </button>
          )}
          <button type="submit" className="primary-btn" disabled={!input.trim()}>
            Ask
          </button>
        </form>
      </aside>
    </div>
  );
}

function GuruBubble({
  reply,
  speaking,
  onSpeak,
  onSuggestion,
}: {
  reply: GuruReply;
  speaking: boolean;
  onSpeak: () => void;
  onSuggestion: (text: string) => void;
}) {
  return (
    <div className="guru-msg guru-msg--guru">
      <GuruAvatar size={40} speaking={speaking} mood="idle" className="guru-msg__avatar" />
      <div className="guru-msg__body">
        <p className="guru-answer">
          <span className={reply.primary === 'or' ? 'or' : 'en'}>{reply.primary === 'or' ? reply.answer_or : reply.answer_en}</span>
          <span className={`muted ${reply.primary === 'or' ? 'en' : 'or'}`}>
            {reply.primary === 'or' ? reply.answer_en : reply.answer_or}
          </span>
        </p>

        {reply.sections.map((section, index) => (
          <div
            key={`${section.kind}-${index}`}
            className={`guru-section ${section.kind === 'confusion' ? 'is-confusion' : ''}`}
          >
            <h4>
              <span className="or">{section.title_or}</span>
              <span className="en muted">{section.title_en}</span>
            </h4>
            <p className="or">{section.body_or}</p>
            <p className="en muted">{section.body_en}</p>
          </div>
        ))}

        <div className="guru-msg__foot">
          <button type="button" className="ghost-btn" onClick={onSpeak}>
            ▷ Speak
          </button>
          {reply.suggestions.slice(0, 4).map((suggestion) => (
            <button
              key={suggestion.en}
              type="button"
              className="chip"
              onClick={() => onSuggestion(suggestion.en)}
            >
              {suggestion.or}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
