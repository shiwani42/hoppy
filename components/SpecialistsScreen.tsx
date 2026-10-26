"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Sheet } from "@/components/Sheet";
import { loadProfile } from "@/lib/profile";
import { loadRequests, loadSpecialists, requestConsult, type ConsultRequest, type Specialist } from "@/lib/specialists";
import { ensureSession } from "@/lib/supabase/client";

const ROLES = [
  ["all", "All", "✨"], ["dietitian", "Dietitians", "🩺"], ["nutritionist", "Nutritionists", "🥗"], ["trainer", "Trainers", "🏋️"], ["yoga", "Yoga", "🧘"],
] as const;

/** prd.md > Specialists — browse, then request a consult with your report attached. */
export function SpecialistsScreen() {
  const router = useRouter();
  const [list, setList] = useState<Specialist[]>([]);
  const [requests, setRequests] = useState<ConsultRequest[]>([]);
  const [role, setRole] = useState<(typeof ROLES)[number][0]>("all");
  const [picked, setPicked] = useState<Specialist | null>(null);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    (async () => {
      await ensureSession();
      if (!(await loadProfile())?.name) return router.replace("/onboarding");
      const [s, r] = await Promise.all([loadSpecialists(), loadRequests()]);
      setList(s);
      setRequests(r);
    })().catch(console.error);
  }, [router]);

  async function send() {
    if (!picked) return;
    setState("sending");
    try {
      await requestConsult(picked.id, note);
      setRequests(await loadRequests());
      setState("sent");
    } catch (err) {
      console.error(err);
      setState("error");
    }
  }

  const shown = list.filter((s) => role === "all" || s.role === role);
  const requested = new Set(requests.map((r) => r.specialist_id));

  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-6 pb-10">
      <PageHeader title="Specialists" />
      <p className="rounded-2xl bg-turmeric/15 px-4 py-3 text-sm">
        These are <strong>sample profiles</strong> to show how consults will work — requests are saved, but no real specialist receives them yet.
      </p>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5" role="group" aria-label="Filter by role">
        {ROLES.map(([v, label, emoji]) => (
          <button key={v} aria-pressed={role === v} onClick={() => setRole(v)}
            className={`h-11 shrink-0 rounded-full px-4 font-display font-semibold ${role === v ? "bg-teal text-white" : "bg-card"}`}>
            {emoji} {label}
          </button>
        ))}
      </div>
      <ul className="flex flex-col gap-3">
        {shown.map((s) => (
          <li key={s.id} className="rounded-3xl bg-card p-4 shadow-sm" data-testid="specialist">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-display text-lg font-bold">{s.name}</p>
                <p className="text-sm text-ink-soft capitalize">{s.role} · {s.city} · {s.languages.join(", ")}</p>
              </div>
              {s.is_sample && <span className="shrink-0 rounded-full bg-cream px-2 py-1 text-xs text-ink-soft">Sample</span>}
            </div>
            <p className="mt-2 text-sm">{s.bio}</p>
            <button
              onClick={() => { setPicked(s); setNote(""); setState("idle"); }}
              className="mt-3 h-11 w-full rounded-full bg-teal-soft font-display font-semibold text-teal"
            >
              {requested.has(s.id) ? "Requested ✓ · send another" : "Request consult"}
            </button>
          </li>
        ))}
      </ul>

      {picked && (
        <Sheet open onClose={() => setPicked(null)} title={state === "sent" ? "Request sent ✓" : `Consult ${picked.name.replace(" (sample)", "")}`}>
          {state === "sent" ? (
            <>
              <p className="text-ink-soft">Your request and your 30-day Hoppy report are saved. (This is a sample profile, so no one will reply yet.)</p>
              <button onClick={() => setPicked(null)} className="mt-5 h-12 w-full rounded-full bg-teal font-display font-semibold text-white">Done</button>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-soft">Your 30-day report (stats, calories, weight trend and summary) will be attached.</p>
              <label className="mt-3 block text-sm text-ink-soft">What would you like help with? (optional)
                <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3}
                  className="mt-1 w-full rounded-2xl border border-line bg-cream p-3 outline-none focus:border-teal" placeholder="e.g. A veg meal plan that fits my 1,400 kcal target" />
              </label>
              {state === "error" && <p className="mt-2 text-strength">That didn&apos;t send. Try again?</p>}
              <button onClick={send} disabled={state === "sending"} className="mt-4 h-14 w-full rounded-full bg-teal font-display text-lg font-semibold text-white disabled:opacity-50">
                {state === "sending" ? "Sending…" : "Send request with my report"}
              </button>
            </>
          )}
        </Sheet>
      )}
    </main>
  );
}
