"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Confetti } from "@/components/art";
import { buttonClass } from "@/components/ui";
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
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      {state?.ok && <Confetti burst={1} count={36} spread={200} />}
      <span className="flex h-28 w-28 items-center justify-center rounded-full bg-peach text-[56px]" aria-hidden>{state?.ok === false ? "🤔" : "🤝"}</span>
      <h1 className="font-display text-[30px] leading-tight font-extrabold" role="status">{state?.text ?? "Connecting you…"}</h1>
      {state && (
        <Link href={state.ok ? "/community" : "/"} className={`${buttonClass()} max-w-xs`}>
          {state.ok ? "See Hoppy Friends" : "Go home"}
        </Link>
      )}
    </main>
  );
}
