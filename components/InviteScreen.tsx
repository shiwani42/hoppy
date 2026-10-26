"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInvite, PENDING_INVITE } from "@/lib/community/client";
import { loadProfile } from "@/lib/profile";
import { ensureSession } from "@/lib/supabase/client";

/** Accepts a friend invite; new users onboard first and the invite is accepted afterwards. */
export function InviteScreen({ code }: { code: string }) {
  const router = useRouter();
  const [state, setState] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      await ensureSession();
      const p = await loadProfile();
      if (!p?.name) {
        try {
          localStorage.setItem(PENDING_INVITE, code);
        } catch {}
        return router.replace("/onboarding");
      }
      try {
        const name = await acceptInvite(code);
        setState({ ok: true, text: `You and ${name ?? "your friend"} are now Hoppy friends 🤝` });
      } catch (err) {
        setState({ ok: false, text: (err as Error).message });
      }
    })().catch(console.error);
  }, [code, router]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-display text-5xl" aria-hidden>{state?.ok === false ? "🤔" : "🤝"}</p>
      <h1 className="font-display text-3xl font-bold" role="status">{state?.text ?? "Connecting you…"}</h1>
      {state && (
        <Link href={state.ok ? "/community" : "/"} className="h-14 w-full max-w-xs rounded-full bg-teal font-display text-lg font-semibold leading-[3.5rem] text-white">
          {state.ok ? "See the leaderboard" : "Go home"}
        </Link>
      )}
    </main>
  );
}
