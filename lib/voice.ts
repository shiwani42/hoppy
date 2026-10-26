"use client";

/**
 * Voice capture. With Gemini configured we record audio (Hinglish-aware
 * transcription on the server); otherwise Chrome's on-device speech recognition
 * gives a free transcript.
 */

type SR = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function deviceSpeech(): (new () => SR) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type Recording = { stop: () => Promise<{ audio?: Blob; transcript?: string }> };

/** Feeds a 0–1 loudness level to `onLevel` about 30 times a second; returns a stop function. */
function meter(stream: MediaStream, onLevel: (v: number) => void) {
  const ctx = new AudioContext();
  const an = ctx.createAnalyser();
  an.fftSize = 256;
  ctx.createMediaStreamSource(stream).connect(an);
  const buf = new Uint8Array(an.frequencyBinCount);
  let raf = 0;
  const tick = () => {
    an.getByteTimeDomainData(buf);
    let sum = 0;
    for (const b of buf) sum += ((b - 128) / 128) ** 2;
    onLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
    raf = requestAnimationFrame(tick);
  };
  tick();
  return () => {
    cancelAnimationFrame(raf);
    ctx.close().catch(() => {});
  };
}

export async function startRecording(useServer: boolean, onLevel?: (v: number) => void): Promise<Recording> {
  if (useServer && typeof MediaRecorder !== "undefined") {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const stopMeter = onLevel ? meter(stream, onLevel) : () => {};
    const rec = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.start();
    return {
      stop: () =>
        new Promise((resolve) => {
          rec.onstop = () => {
            stopMeter();
            stream.getTracks().forEach((t) => t.stop());
            resolve({ audio: new Blob(chunks, { type: rec.mimeType || "audio/webm" }) });
          };
          rec.stop();
        }),
    };
  }

  const Speech = deviceSpeech();
  if (!Speech) throw new Error("Voice isn't supported in this browser — type it instead.");
  const sr = new Speech();
  sr.lang = "en-IN"; // Indian English handles Hinglish in Latin script
  sr.interimResults = false;
  sr.maxAlternatives = 1;
  let transcript = "";
  let ended: () => void = () => {};
  const done = new Promise<void>((r) => (ended = r));
  sr.onresult = (e) => {
    transcript = Array.from(e.results).map((r) => r[0].transcript).join(" ");
  };
  sr.onerror = () => ended();
  sr.onend = () => ended();
  sr.start();
  // The level meter is a nicety: on-device speech works without it.
  let stopMeter = () => {};
  let stream: MediaStream | null = null;
  if (onLevel) {
    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((s) => {
        stream = s;
        stopMeter = meter(s, onLevel);
      })
      .catch(() => {});
  }
  return {
    stop: async () => {
      sr.stop();
      stopMeter();
      (stream as MediaStream | null)?.getTracks().forEach((t) => t.stop());
      await done;
      return { transcript: transcript.trim() };
    },
  };
}
