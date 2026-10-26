"use client";

/* eslint-disable @next/next/no-img-element -- static photos */

import { useEffect, useState } from "react";
import { IconCheck, IconClip } from "@/components/icons";
import { Sheet } from "@/components/Sheet";
import { Button, Card, Chip, Loading, Screen, TopBar } from "@/components/ui";
import { useMe } from "@/components/useMe";
import { expertPhoto } from "@/lib/art";
import { loadRequests, loadSpecialists, requestConsult, type ConsultRequest, type Specialist } from "@/lib/specialists";

const ROLES = [
  ["all", "All"], ["dietitian", "Dietitians"], ["nutritionist", "Nutritionists"], ["trainer", "Trainers"], ["yoga", "Yoga"],
] as const;

const display = (s: Specialist) => {
  const n = s.name.replace(" (sample)", "");
  return s.role === "trainer" && !n.startsWith("Dr.") ? `Coach ${n}` : n;
};

function Photo({ s }: { s: Specialist }) {
  const src = expertPhoto(s.photo);
  const initials = s.name.replace("Dr. ", "").split(" ").map((w) => w[0]).slice(0, 2).join("");
  return src ? (
    <img src={src} alt="" className="h-[92px] w-[92px] shrink-0 rounded-[14px] object-cover" />
  ) : (
    <span className="flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-[14px] bg-[linear-gradient(160deg,#e3efed,#c9e0dd)] font-display text-[28px] font-bold text-teal" aria-hidden>
      {initials}
    </span>
  );
}

/** "Expert Support" (images/…7tg0…png, centre): consult a nutritionist, dietitian or trainer, report attached. */
export function SpecialistsScreen() {
  const [me] = useMe();
  const [list, setList] = useState<Specialist[] | null>(null);
  const [requests, setRequests] = useState<ConsultRequest[]>([]);
  const [role, setRole] = useState<(typeof ROLES)[number][0]>("all");
  const [attach, setAttach] = useState<Record<string, boolean>>({});
  const [picked, setPicked] = useState<Specialist | null>(null);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    if (!me) return;
    Promise.all([loadSpecialists(), loadRequests()]).then(([s, r]) => {
      setList(s);
      setRequests(r);
    });
  }, [me]);

  if (!me || !list) return <Loading />;

  async function send() {
    if (!picked) return;
    setState("sending");
    try {
      await requestConsult(picked.id, note, attach[picked.id] !== false);
      setRequests(await loadRequests());
      setState("sent");
    } catch (err) {
      console.error(err);
      setState("error");
    }
  }

  // Profiles with a photo first, then by role.
  const order = { dietitian: 0, trainer: 1, nutritionist: 2, yoga: 3 } as const;
  const shown = list
    .filter((s) => role === "all" || s.role === role)
    .sort((a, b) => Number(!!expertPhoto(b.photo)) - Number(!!expertPhoto(a.photo)) || order[a.role] - order[b.role]);
  const requested = new Set(requests.map((r) => r.specialist_id));

  return (
    <Screen>
      <TopBar />
      <h1 className="mt-3 font-display text-[34px] leading-tight font-extrabold">Expert Support</h1>
      <p className="mt-1 text-[17px] leading-snug text-ink-soft">Consult with a nutritionist, dietitian, or trainer.</p>

      <div className="no-scrollbar -mx-6 mt-4 flex gap-2 overflow-x-auto px-6" role="group" aria-label="Filter by role">
        {ROLES.map(([v, label]) => (
          <Chip key={v} selected={role === v} onClick={() => setRole(v)}>{label}</Chip>
        ))}
      </div>

      <ul className="mt-4 flex flex-col gap-4">
        {shown.map((s) => {
          const on = attach[s.id] !== false;
          return (
            <li key={s.id}>
              <Card className="p-4" data-testid="specialist">
                <div className="flex gap-4">
                  <Photo s={s} />
                  <div className="min-w-0 flex-1 pt-1">
                    <p className="font-display text-[20px] leading-tight font-bold">{display(s)}</p>
                    <p className="mt-0.5 text-[15px] leading-snug text-ink-soft">{s.title ?? s.role}</p>
                    {s.years && <p className="text-[15px] text-ink-soft">• {s.years}+ yrs exp · {s.city}</p>}
                  </div>
                </div>
                <div className="my-3 h-px bg-[#efe6d6]" />
                {s.specialty && <p className="inline-block rounded-full bg-sand px-3 py-1 text-[14px]">Specializes in: {s.specialty}</p>}
                <Button className="mt-3" size="md" onClick={() => { setPicked(s); setNote(""); setState("idle"); }}>
                  {requested.has(s.id) ? "Requested ✓ · Ask again" : "Request Consult"}
                </Button>
                <button onClick={() => setAttach({ ...attach, [s.id]: !on })} aria-pressed={on} className="mt-2 flex items-center gap-2 py-1 text-[15px]">
                  <IconClip size={20} className={on ? "text-teal" : "text-ink-faint"} />
                  <span className={on ? "" : "text-ink-faint line-through"}>Attach &ldquo;My Health Report&rdquo; (PDF)</span>
                  {on && <IconCheck size={16} className="text-teal" />}
                </button>
              </Card>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-center text-[13px] text-ink-soft">These are sample profiles showing how consults work — requests are saved, but no one replies yet.</p>

      {picked && (
        <Sheet open onClose={() => setPicked(null)} title={state === "sent" ? "Request sent ✓" : `Consult ${display(picked)}`}>
          {state === "sent" ? (
            <>
              <p className="text-ink-soft">
                Your request{attach[picked.id] !== false ? " and your 30-day Hoppy report are" : " is"} saved. (This is a sample profile, so no one will reply yet.)
              </p>
              <Button className="mt-5" onClick={() => setPicked(null)}>Done</Button>
            </>
          ) : (
            <>
              <p className="text-[15px] text-ink-soft">
                {attach[picked.id] !== false ? "Your 30-day report (stats, calories, weight trend and summary) will be attached." : "No report attached."}
              </p>
              <label className="mt-3 block font-display text-[15px] font-semibold">What would you like help with? (optional)
                <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3}
                  className="mt-1 w-full rounded-[14px] border border-[#e6dcc9] bg-card p-3 font-sans text-[16px] font-normal outline-none focus:border-teal" placeholder="e.g. A veg meal plan that fits my 1,400 kcal target" />
              </label>
              {state === "error" && <p className="mt-2 text-strength">That didn&apos;t send. Try again?</p>}
              <Button className="mt-4" onClick={send} disabled={state === "sending"}>
                {state === "sending" ? "Sending…" : "Send request"}
              </Button>
            </>
          )}
        </Sheet>
      )}
    </Screen>
  );
}
