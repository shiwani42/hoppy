"use client";

/* eslint-disable @next/next/no-img-element -- signed Storage URLs */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { STAGE_BODIES } from "@/lib/ai/prompts";
import { loadFeed, loadInviteCode, loadLeaderboard, type FeedCard, type LeaderRow } from "@/lib/community/client";
import { loadProfile } from "@/lib/profile";
import { ensureSession, supabase } from "@/lib/supabase/client";

const MEDALS = ["🥇", "🥈", "🥉"];

/** prd.md > Community — invite friends, a fair weekly leaderboard, and their shared cards. */
export function CommunityScreen() {
  const router = useRouter();
  const [link, setLink] = useState<string | null>(null);
  const [board, setBoard] = useState<LeaderRow[]>([]);
  const [feed, setFeed] = useState<FeedCard[]>([]);
  const [anonymous, setAnonymous] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const session = await ensureSession();
      if (!(await loadProfile())?.name) return router.replace("/onboarding");
      setAnonymous(!!session.user.is_anonymous);
      const [code, b, f] = await Promise.all([loadInviteCode(), loadLeaderboard(), loadFeed()]);
      if (code) setLink(`${window.location.origin}/invite/${code}`);
      setBoard(b);
      setFeed(f);
    })().catch(console.error);
  }, [router]);

  async function shareInvite() {
    if (!link) return;
    const text = `Join me on Hoppy — my avatar gets fitter as I do 💪 ${link}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(link);
        setNote("Invite link copied ✓");
      }
    } catch {}
  }

  async function linkGoogle() {
    const { error } = await supabase().auth.linkIdentity({ provider: "google", options: { redirectTo: `${window.location.origin}/community` } });
    if (error) setNote("Google sign-in isn't set up for this Hoppy yet. Your progress is still saved on this device.");
  }

  const friends = board.filter((r) => !r.is_me).length;

  return (
    <main className="flex flex-1 flex-col gap-5 px-5 pt-6 pb-10">
      <PageHeader title="Friends" />
      {note && <p role="status" className="rounded-2xl bg-ink px-4 py-3 text-center text-cream">{note}</p>}

      <section className="rounded-3xl bg-gradient-to-br from-teal-soft to-turmeric/15 p-4 shadow-sm" aria-label="Invite">
        <h2 className="font-display text-xl font-bold">Bring a friend along</h2>
        <p className="text-ink-soft">Friends see each other&apos;s shared cards and weekly strong days — nothing else.</p>
        {link && <p className="mt-2 truncate rounded-xl bg-card px-3 py-2 text-sm" data-testid="invite-link">{link}</p>}
        <button onClick={shareInvite} className="mt-3 h-12 w-full rounded-full bg-teal font-display font-semibold text-white">Share invite link ↗</button>
      </section>

      <section className="rounded-3xl bg-card p-4 shadow-sm" aria-label="Leaderboard">
        <h2 className="font-display text-xl font-bold">This week</h2>
        <p className="text-sm text-ink-soft">Ranked by strong days in the last 7 days — consistency, not kilos, so it&apos;s fair for every body.</p>
        <ol className="mt-3 flex flex-col gap-2">
          {board.map((r, i) => (
            <li key={r.user_id} className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${r.is_me ? "bg-teal-soft" : "bg-cream"}`} data-testid="leader-row">
              <span className="w-8 text-center font-display text-xl">{MEDALS[i] ?? i + 1}</span>
              <span className="flex-1">
                <span className="block font-display text-lg font-semibold">{r.is_me ? `${r.name} (you)` : r.name}</span>
                <span className="text-xs text-ink-soft">Stage {r.current_stage} · {STAGE_BODIES[r.current_stage]?.name}</span>
              </span>
              <span className="font-display text-2xl font-bold text-teal">{r.strong_days}</span>
              <span className="text-xs text-ink-soft">/ 7</span>
            </li>
          ))}
        </ol>
        {friends === 0 && <p className="mt-2 text-sm text-ink-soft">Invite a friend to see them here.</p>}
      </section>

      <section aria-label="Feed">
        <h2 className="font-display text-xl font-bold">Shared cards</h2>
        {feed.length === 0 ? (
          <p className="mt-2 text-ink-soft">When you or your friends share a day or a milestone, it shows up here.</p>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-3">
            {feed.map((c) => (
              <li key={c.id} className="overflow-hidden rounded-2xl bg-card shadow-sm" data-testid="feed-card">
                {c.url && <img src={c.url} alt={c.title} className="aspect-[9/16] w-full object-cover" />}
                <p className="px-2 py-1.5 text-xs"><strong>{c.name ?? "Friend"}</strong> · {c.title}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {anonymous && (
        <section className="rounded-3xl bg-card p-4 shadow-sm" aria-label="Account">
          <h2 className="font-display text-lg font-bold">Keep your progress safe</h2>
          <p className="text-sm text-ink-soft">Right now Hoppy lives on this device. Link Google to keep everything if you switch phones.</p>
          <button onClick={linkGoogle} className="mt-3 h-12 w-full rounded-full border border-teal font-display font-semibold text-teal">Save my progress with Google</button>
        </section>
      )}
    </main>
  );
}
