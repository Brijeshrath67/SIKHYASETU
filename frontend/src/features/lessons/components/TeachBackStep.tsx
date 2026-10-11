import { useEffect, useState } from 'react';
import { isRecordingSupported, startRecording, type RecordingHandle } from '../../../shared/lib/offline/audio';

type TeachBackStepProps = {
  prompt: string;
  promptEn?: string;
  transcript: string;
  onTranscript: (value: string) => void;
  audioKb: number;
  onAudio: (kb: number) => void;
  onSubmit: () => void;
};

export function TeachBackStep({
  prompt,
  promptEn,
  transcript,
  onTranscript,
  audioKb,
  onAudio,
  onSubmit,
}: TeachBackStepProps) {
  const [recording, setRecording] = useState<RecordingHandle | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setElapsed(recording.elapsedMs()), 250);
    return () => window.clearInterval(timer);
  }, [recording]);

  async function toggleRecord() {
    if (recording) {
      const { audioKb: size } = await recording.stop();
      onAudio(size);
      setRecording(null);
      return;
    }
    try {
      setElapsed(0);
      setRecording(await startRecording());
    } catch {
      setRecording(null);
    }
  }

  return (
    <article className="card lesson-card">
      <span className="lesson-card__badge">TEACH-BACK DEMONSTRATION</span>
      <h2 className="card__title">ନିଜ ଭାଷାରେ ବୁଝାଅ (Teach It Back)</h2>
      <p className="card__prompt">{prompt}</p>
      {promptEn && <p className="card__prompt card__prompt--en muted">{promptEn}</p>}

      <div className="teachback-tools">
        {isRecordingSupported() && (
          <div className="recorder-row">
            <button
              type="button"
              className={`btn ${recording ? 'btn--danger' : 'ghost-btn'}`}
              onClick={() => void toggleRecord()}
            >
              {recording ? `⏺ Recording (${Math.round(elapsed / 1000)}s) · Click to Stop` : '🎙 Record Audio Explanation'}
            </button>
            {audioKb > 0 && (
              <span className="recorder__meta">
                {audioKb} KB audio stored locally on device
              </span>
            )}
          </div>
        )}

        <textarea
          className="transcript"
          rows={4}
          placeholder="ତୁମର ବ୍ୟାଖ୍ୟା ଏଠାରେ ଲେଖ… (Type your explanation in Odia or English)"
          value={transcript}
          onChange={(event) => onTranscript(event.target.value)}
        />
      </div>

      <button
        type="button"
        className="primary-btn"
        disabled={transcript.trim().length === 0}
        onClick={onSubmit}
      >
        Submit Teach-Back for Local Evaluation →
      </button>
    </article>
  );
}
