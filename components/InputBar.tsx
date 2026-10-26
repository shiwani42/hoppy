"use client";

import { useRef, useState } from "react";
import { startRecording, type Recording } from "@/lib/voice";

/**
 * Pinned bottom bar (Zest-style): snap a meal, type a log or a question,
 * search the food list, or hold a voice note.
 */
export function InputBar({
  onPhoto,
  onSearch,
  onText,
  onVoice,
  serverVoice,
  placeholder = "Type what you ate or did…",
}: {
  onPhoto: (file: File) => void;
  onSearch: () => void;
  onText: (text: string) => Promise<void> | void;
  onVoice: (r: { audio?: Blob; transcript?: string }) => Promise<void> | void;
  serverVoice: boolean;
  placeholder?: string;
}) {
  const camera = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [rec, setRec] = useState<Recording | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  async function toggleMic() {
    setVoiceError(null);
    if (rec) {
      setRec(null);
      await onVoice(await rec.stop());
      return;
    }
    try {
      setRec(await startRecording(serverVoice));
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Couldn't start the mic");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText("");
    await onText(t);
  }

  return (
    <div className="sticky bottom-0 z-30 -mx-5 mt-auto bg-gradient-to-t from-cream via-cream to-cream/0 px-5 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        data-testid="meal-photo-input"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onPhoto(f);
        }}
      />
      {voiceError && <p role="status" className="mb-2 text-center text-sm text-ink-soft">{voiceError}</p>}
      <form onSubmit={submit} className="flex items-center gap-1.5 rounded-full bg-card p-1.5 shadow-lg">
        <button type="button" onClick={() => camera.current?.click()} aria-label="Snap a meal"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal text-xl text-white active:scale-95">
          📷
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={rec ? "Listening… tap ■ when done" : placeholder}
          aria-label="Log or ask"
          enterKeyHint="send"
          className="h-12 min-w-0 flex-1 bg-transparent px-2 outline-none placeholder:text-ink-soft"
        />
        <button type="button" onClick={onSearch} aria-label="Search food" className="flex h-12 w-10 shrink-0 items-center justify-center rounded-full text-lg active:scale-95">
          🔍
        </button>
        {text.trim() ? (
          <button aria-label="Send" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-turmeric text-xl text-white active:scale-95">➤</button>
        ) : (
          <button type="button" onClick={toggleMic} aria-label={rec ? "Stop recording" : "Speak a log"} aria-pressed={!!rec}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl active:scale-95 ${rec ? "animate-pulse bg-strength text-white" : "bg-cream"}`}>
            {rec ? "■" : "🎤"}
          </button>
        )}
      </form>
    </div>
  );
}
