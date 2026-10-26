"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { loadAvatarStages, type AvatarStage } from "@/lib/avatar/client";
import { greeting } from "@/lib/greeting";
import { loadProfile, type Profile } from "@/lib/profile";
import { ensureSession } from "@/lib/supabase/client";

/** prd.md > Screens and Layout — Home (chat). */
export function Home() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatar, setAvatar] = useState<AvatarStage | null>(null);

  useEffect(() => {
    (async () => {
      await ensureSession();
      const p = await loadProfile();
      const stages = await loadAvatarStages();
      if (!p?.name || !stages[1]) {
        router.replace("/onboarding");
        return;
      }
      setProfile(p);
      setAvatar(stages[p.current_stage] ?? stages[1]);
    })().catch(console.error);
  }, [router]);

  if (!profile) {
    return <main className="flex flex-1 items-center justify-center font-display text-xl text-ink-soft">Hoppy…</main>;
  }

  return (
    <main className="flex flex-1 flex-col items-center px-5 pt-10 pb-6">
      <h1 className="font-display text-3xl font-bold">
        {greeting()}, {profile.name}.
      </h1>
      <Avatar url={avatar?.url} isPlaceholder={avatar?.is_placeholder} className="mt-6" />
    </main>
  );
}
