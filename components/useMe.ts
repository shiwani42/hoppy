"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadProfile, type Profile } from "@/lib/profile";
import { ensureSession } from "@/lib/supabase/client";

/** The signed-in user's profile; sends anyone without a twin yet to onboarding. */
export function useMe() {
  const router = useRouter();
  const [me, setMe] = useState<Profile | null>(null);
  useEffect(() => {
    (async () => {
      await ensureSession();
      const p = await loadProfile();
      if (!p?.name) return router.replace("/onboarding");
      setMe(p);
    })().catch(console.error);
  }, [router]);
  return [me, setMe] as const;
}
