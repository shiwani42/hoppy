"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShareCard, type ShareCardData } from "@/components/ShareCard";
import { loadAvatarStages } from "@/lib/avatar/client";
import { loadProfile } from "@/lib/profile";
import { recordCard, renderCard, shareOrDownload } from "@/lib/share/client";
import { todayCard } from "@/lib/share/data";
import { progressFor } from "@/lib/stages/client";
import { loadToday } from "@/lib/stats/today";
import { ensureSession } from "@/lib/supabase/client";

/** Preview + share for a card (spec.md > Share Cards). */
export function ShareScreen({ kind }: { kind: "today" | "milestone" }) {
  const router = useRouter();
  const card = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<ShareCardData | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      await ensureSession();
      const p = await loadProfile();
      if (!p?.name) return router.replace("/onboarding");
      const [t, stages, prog] = await Promise.all([loadToday(p), loadAvatarStages(), progressFor(p)]);
      setData(todayCard(p, t, stages, prog));
    })().catch(console.error);
  }, [router, kind]);

  async function go() {
    if (!card.current || !data) return;
    setBusy(true);
    setStatus(null);
    try {
      const blob = await renderCard(card.current);
      await recordCard(blob, kind, data.title);
      const how = await shareOrDownload(blob, `hoppy-${kind}.png`, `${data.title} on Hoppy 💪`);
      setStatus(how === "shared" ? "Shared! 🎉" : how === "downloaded" ? "Saved to your downloads" : null);
    } catch (err) {
      console.error(err);
      setStatus("Couldn't make the image. Try again?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center px-5 pt-6 pb-8">
      <div className="flex w-full items-center justify-between">
        <Link href="/" className="rounded-full px-3 py-2 font-display font-semibold text-teal">← Back</Link>
        <p className="font-display text-lg font-semibold">Share your day</p>
        <span className="w-16" />
      </div>
      <div className="mt-4 overflow-hidden rounded-[1.5rem] shadow-xl" style={{ width: 324, height: 576 }}>
        <div style={{ transform: "scale(0.9)", transformOrigin: "top left" }}>
          {data ? <ShareCard ref={card} d={data} /> : <div className="h-[640px] w-[360px] animate-pulse bg-line" />}
        </div>
      </div>
      {status && <p role="status" className="mt-3 text-ink-soft">{status}</p>}
      <button
        onClick={go}
        disabled={!data || busy}
        className="mt-5 h-14 w-full max-w-sm rounded-full bg-teal font-display text-lg font-semibold text-white shadow-md disabled:opacity-40"
      >
        {busy ? "Drawing…" : "Share ↗"}
      </button>
      <p className="mt-2 text-center text-xs text-ink-soft">Instagram Stories, WhatsApp, X — or save the image.</p>
    </main>
  );
}
