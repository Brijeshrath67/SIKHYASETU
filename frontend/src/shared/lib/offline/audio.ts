/**
 * Best-effort microphone capture for teach-back. Absence of MediaRecorder is
 * not fatal: the learner can type the explanation, which the deterministic
 * grader accepts. A production build would add on-device STT here.
 */

export type RecordingHandle = {
  stop: () => Promise<{ audioKb: number; mimeType: string }>;
  cancel: () => void;
  elapsedMs: () => number;
};

export function isRecordingSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
}

export async function startRecording(): Promise<RecordingHandle> {
  if (!isRecordingSupported()) {
    throw new Error('Audio recording is not supported on this device.');
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream);
  const startedAt = Date.now();
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  recorder.start();

  const release = () => stream.getTracks().forEach((track) => track.stop());

  return {
    elapsedMs: () => Date.now() - startedAt,
    cancel: () => {
      recorder.onstop = null;
      recorder.stop();
      release();
    },
    stop: () =>
      new Promise((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          release();
          resolve({ audioKb: Math.max(1, Math.round(blob.size / 1024)), mimeType: blob.type });
        };
        recorder.stop();
      }),
  };
}
