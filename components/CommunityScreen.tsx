"use client";

/* eslint-disable @next/next/no-img-element -- signed Storage URLs */

import { useEffect, useState } from "react";
import { Confetti } from "@/components/art";
import { IconPlus } from "@/components/icons";
import { Button, Card, Loading, Screen, Tabs, Toast, TopBar } from "@/components/ui";
import { useMe } from "@/components/useMe";
import { loadFeed, loadInviteCode, loadLeaderboard, loadMyFortnight, sendCheer, type FeedCard, type LeaderRow } from "@/lib/community/client";
import { dateKey } from "@/lib/stats/today";
import { ensureSession, supabase } from "@/lib/supabase/client";

const MEDAL = [
  { fill: "#e2b04a", ring: "#f6d98b", text: "1st" },
  { fill: "#b9c0c8", ring: "#e3e7ec", text: "2nd" },
  { fill: "#c98a55", ring: "#ebc19a", text: "3rd" },
];

function Medal({ rank }: { rank: number }) {
  const m = MEDAL[rank];
  if (!m) return <span className="w-10 text-center font-display text-[16px] font-semibold text-ink-soft">{rank + 1}th</span>;
  return (
    <svg width="40" height="44" viewBox="0 0 40 44" aria-label={`${m.text} place`} className="shrink-0">
      <path d="M12 26 L8 42 L14 38 L18 43 L20 28 Z" fill={rank === 0 ? "#d04848" : rank === 1 ? "#4a74b8" : "#4d9831"} />
      <path d="M28 26 L32 42 L26 38 L22 43 L20 28 Z" fill={rank === 0 ? "#b23838" : rank === 1 ? "#3b5f99" : "#3d7d27"} />
      <circle cx="20" cy="18" r="15" fill={m.fill} stroke={m.ring} strokeWidth="3" />
      <text x="20" y="22.5" textAnchor="middle" fontFamily="var(--font-baloo)" fontWeight="800" fontSize="12" fill="#3a2a10">{m.text}</text>
    </svg>
  );
}

function Face({ r, size = 52 }: { r: Pick<LeaderRow, "avatar_url" | "name">; size?: number }) {
  const initials = (r.name ?? "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span className="relative block shrink-0 overflow-hidden rounded-full bg-[radial-gradient(circle_at_50%_35%,#fbe7c4,#f0c98c)] shadow-[inset_0_0_0_2px_#fff]" style={{ width: size, height: size }}>
      {r.avatar_url ? (
        <img src={r.avatar_url} alt="" className="absolute inset-x-0 top-0 h-[150%] w-full object-cover object-top" />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-display text-[18px] font-bold text-[#8a5a1c]">{initials}</span>
      )}
    </span>
  );
}

/** "Hoppy Friends" (images/…gz31…png, right): a fair weekly leaderboard, cheers and invites. */
export function CommunityScreen() {
  const [me] = useMe();
  const [tab, setTab] = useState<"friends" | "challenges">("friends");
  const [link, setLink] = useState<string | null>(null);
  const [board, setBoard] = useState<LeaderRow[] | null>(null);
  const [feed, setFeed] = useState<FeedCard[]>([]);
  const [fortnight, setFortnight] = useState<{ date: string; strong: boolean }[]>([]);
  const [weeks, setWeeks] = useState<{ days: string[]; lastWeek: string[] }>({ days: [], lastWeek: [] });
  const [anonymous, setAnonymous] = useState(true);
  const [note, setNote] = useState<string | null>(null);
  const [cheered, setCheered] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (!me) return;
    (async () => {
      const session = await ensureSession();
      setAnonymous(!!session.user.is_anonymous);
      const [code, b, f, w] = await Promise.all([loadInviteCode(), loadLeaderboard(), loadFeed(), loadMyFortnight()]);
      if (code) setLink(`${window.location.origin}/invite/${code}`);
      setBoard(b);
      setFeed(f);
      setFortnight(w);
      const at = (n: number) => dateKey(new Date(Date.now() - n * 864e5));
      setWeeks({ days: [6, 5, 4, 3, 2, 1, 0].map(at), lastWeek: [13, 12, 11, 10, 9, 8, 7].map(at) });
    })().catch(console.error);
  }, [me]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 3500);
    return () => clearTimeout(t);
  }, [note]);

  if (!me || !board) return <Loading />;

  async function shareInvite() {
    if (!link) return;
    const text = `Join me on Hoppy — my twin gets fitter as I do 💪 ${link}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(link);
        setNote("Invite link copied ✓");
      }
    } catch {}
  }

  async function cheer(r: LeaderRow) {
    try {
      await sendCheer(r.user_id);
      setCheered(r.user_id);
      setBurst(Date.now());
      setNote(`Shabaash sent to ${r.name?.split(" ")[0]} 👏`);
    } catch {
      setNote("Couldn't send that cheer. Try again?");
    }
  }

  async function linkGoogle() {
    const { error } = await supabase().auth.linkIdentity({ provider: "google", options: { redirectTo: `${window.location.origin}/community` } });
    if (error) setNote("Google sign-in isn't set up for this Hoppy yet. Your progress is still saved on this device.");
  }

  const friends = board.filter((r) => !r.is_me);
  const hot = [...friends].sort((a, b) => b.streak - a.streak)[0];
  const { days, lastWeek } = weeks;
  const strongSet = new Set(fortnight.filter((d) => d.strong).map((d) => d.date));
  const mine = days.filter((d) => strongSet.has(d)).length;
  const before = lastWeek.filter((d) => strongSet.has(d)).length;

  return (
    <Screen>
      <TopBar />
      <h1 className="mt-3 font-display text-[34px] leading-tight font-extrabold">Hoppy Friends</h1>
      <div className="mt-2">
        <Tabs value={tab} onChange={setTab} tabs={[["friends", "Friends"], ["challenges", "Weekly Challenges"]]} />
      </div>

      {tab === "friends" ? (
        <>
          <Card className="relative mt-4 px-4 pt-4 pb-3" aria-label="Leaderboard">
            <span className="absolute -top-3 right-4 text-[34px] drop-shadow" aria-hidden>⭐</span>
            <h2 className="font-display text-[21px] leading-tight font-bold">Is Hafte Ki Consistency</h2>
            <p className="font-display text-[15px] font-semibold text-ink-soft">(This Week&apos;s Consistency)</p>
            <p className="text-[13px] text-ink-soft">Friends by strong days this week — consistency, not kilos, so it&apos;s fair for every body.</p>
            <ol className="mt-3 flex flex-col">
              {board.map((r, i) => (
                <li key={r.user_id} className={`relative flex items-center gap-3 border-t border-[#f3ecdf] py-2.5 ${r.is_me ? "-mx-2 rounded-[14px] border-transparent bg-teal-soft px-2" : ""}`} data-testid="leader-row">
                  <Medal rank={i} />
                  <Face r={r} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[18px] font-bold">{r.is_me ? `${r.name?.split(" ")[0]} (You)` : r.name}</span>
                    <span className="text-[14px] text-ink-soft">— {r.strong_days} strong day{r.strong_days === 1 ? "" : "s"}{r.streak >= 7 ? " 🔥" : ""}</span>
                  </span>
                  {i === 0 && r.strong_days > 0 && (
                    <span className="absolute -top-1 right-0 rotate-6 rounded-[6px] bg-saffron-soft px-2 py-0.5 font-display text-[13px] font-bold text-[#8a5a1c] shadow-sm">Shabaash!</span>
                  )}
                </li>
              ))}
            </ol>
            {friends.length === 0 && <p className="pt-2 text-[14px] text-ink-soft">Invite a friend to see them here.</p>}
          </Card>

          {hot && hot.streak >= 3 && (
            <div className="relative mt-3">
              <Confetti burst={burst || undefined} still={false} count={burst ? 24 : 0} spread={120} />
              <button onClick={() => cheer(hot)} disabled={cheered === hot.user_id} className="flex w-full items-center gap-3 rounded-[20px] bg-card px-4 py-3 text-left shadow-card active:scale-[.99] disabled:opacity-70">
                <Face r={hot} size={44} />
                <span className="flex-1 leading-snug">
                  <span className="block font-display text-[17px] font-bold">{hot.name?.split(" ")[0]} is on a {hot.streak}-day streak!</span>
                  <span className="text-[15px] text-ink-soft">{cheered === hot.user_id ? "Cheer sent ✓" : "Send a cheer 👏"}</span>
                </span>
              </button>
            </div>
          )}

          <div className="mt-auto pt-5">
            <Button onClick={shareInvite} className="rounded-full">
              <IconPlus size={22} strokeWidth={2.6} /> Add Friend or Invite
            </Button>
          </div>
        </>
      ) : (
        <>
          <Card className="mt-4 p-4">
            <p className="text-[12px] font-semibold tracking-[0.08em] text-ink-soft uppercase">This week&apos;s challenge</p>
            <h2 className="mt-1 font-display text-[21px] font-bold">Most strong days</h2>
            <p className="text-[14px] text-ink-soft">A strong day is 4 of your 6 daily stats at 70%+. Fair for every age and body — no kilos involved.</p>
            <div className="mt-3 grid grid-cols-7 gap-1.5 text-center" aria-label="Your last 7 days">
              {days.map((d) => (
                <span key={d} className="text-[11px] text-ink-soft">{new Date(`${d}T12:00:00`).toLocaleDateString("en-IN", { weekday: "narrow" })}</span>
              ))}
              {days.map((d) => (
                <span key={d} className={`h-8 rounded-[9px] ${strongSet.has(d) ? "bg-teal" : d === days[6] ? "border-2 border-dashed border-[#cfc6b6]" : "bg-[#ebe3d3]"}`} />
              ))}
            </div>
            <p className="mt-2 text-[14px] text-ink-soft">
              {mine} strong day{mine === 1 ? "" : "s"} so far{mine > before ? ` — ${mine - before} more than last week 🎉` : mine === before ? " — same as last week" : ""}.
            </p>
          </Card>

          <h2 className="mt-5 font-display text-[20px] font-bold">Shared cards</h2>
          {feed.length === 0 ? (
            <p className="mt-1 text-[15px] text-ink-soft">When you or your friends share a day or a milestone, it shows up here.</p>
          ) : (
            <ul className="mt-2 grid grid-cols-2 gap-3">
              {feed.map((c) => (
                <li key={c.id} className="overflow-hidden rounded-[16px] bg-card shadow-card" data-testid="feed-card">
                  {c.url && <img src={c.url} alt={c.title} className="aspect-[9/16] w-full object-cover" />}
                  <p className="px-2 py-1.5 text-[12px]"><strong>{c.name ?? "Friend"}</strong> · {c.title}</p>
                </li>
              ))}
            </ul>
          )}

          {anonymous && (
            <Card className="mt-5 p-4" aria-label="Account">
              <h2 className="font-display text-[18px] font-bold">Keep your progress safe</h2>
              <p className="text-[14px] text-ink-soft">Right now Hoppy lives on this device. Link Google to keep everything if you switch phones.</p>
              <Button variant="outline" size="md" className="mt-3" onClick={linkGoogle}>Save my progress with Google</Button>
            </Card>
          )}
          <div className="mt-auto pt-5">
            <Button onClick={shareInvite} className="rounded-full">
              <IconPlus size={22} strokeWidth={2.6} /> Add Friend or Invite
            </Button>
          </div>
        </>
      )}
      {note && <Toast>{note}</Toast>}
    </Screen>
  );
}
