"use client";

import { useCallback, useEffect, useState } from "react";
import { TwinArt, useTwin } from "@/components/art";
import { IconBell, IconCheck, IconPlus, IconTrash } from "@/components/icons";
import { Sheet } from "@/components/Sheet";
import { Bubble, Button, Chip, Loading, Screen, Toast, TopBar } from "@/components/ui";
import { useMe } from "@/components/useMe";
import { addMed, deleteMed, loadDoses, loadMeds, setTaken, type Dose, type Med } from "@/lib/meds/client";
import { dateKey } from "@/lib/stats/today";
import { supabase } from "@/lib/supabase/client";

const fmt = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).toUpperCase();
};
const mins = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));
/** A dose is "due" from 30 minutes before its time until it's taken. */
const DUE_EARLY_MIN = 30;

const and = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}` : (xs[0] ?? ""));
const short = (n: string) => n.replace(/^(morning|evening|daily|night)\s+/i, "");

/** "Remind me in 15 min": a one-off push sent by the reminders cron. Returns the local time, or null. */
async function remindLater(minutes: number, body: string) {
  const at = new Date(Date.now() + minutes * 60e3);
  const { error } = await supabase().from("snoozes").insert({ title: "Hoppy", body, url: "/meds", remind_at: at.toISOString() });
  return error ? null : at.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

/** "Time for Meds, Suresh!" (images/…ac9n…png, right): the twin reminds, one tap to say it's done. */
export function MedsScreen() {
  const [me] = useMe();
  const twin = useTwin({ poses: ["wave"] });
  const [date, setDate] = useState<string | null>(null);
  const [nowHm, setNowHm] = useState("00:00");
  const [doses, setDoses] = useState<Dose[]>([]);
  const [meds, setMeds] = useState<Med[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", dose: "", kind: "supplement" as Med["kind"], times: ["08:00"] });
  const [toast, setToast] = useState<string | null>(null);

  const reload = useCallback(async (d: string) => {
    const [ds, ms] = await Promise.all([loadDoses(d), loadMeds()]);
    setDoses(ds);
    setMeds(ms);
  }, []);

  useEffect(() => {
    if (!me) return;
    const now = new Date();
    Promise.all([loadDoses(dateKey(now)), loadMeds()])
      .then(([ds, ms]) => {
        setNowHm(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
        setDate(dateKey(now));
        setDoses(ds);
        setMeds(ms);
      })
      .catch(console.error);
  }, [me]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  if (!me || !date) return <Loading />;

  const due = doses.filter((d) => !d.taken && mins(d.time) - DUE_EARLY_MIN <= mins(nowHm));
  const next = doses.find((d) => !d.taken && !due.includes(d));
  const say = due.length
    ? `Aapki ${and([...new Set(due.map((d) => short(d.med.name)))])} ${due.length === 1 ? "is" : "are"} due now! Did you take ${due.length === 1 ? "it" : "them"}?`
    : next
      ? `All caught up! Next: ${short(next.med.name)} at ${fmt(next.time)}. I'll remind you.`
      : doses.length
        ? "Sab ho gaya! Every dose is done for today. Shabaash 🌿"
        : "Add your medicines and supplements — I'll remind you on time.";

  async function flip(d: Dose, taken: boolean) {
    const set = (v: boolean) => setDoses((xs) => xs.map((x) => (x.med.id === d.med.id && x.time === d.time ? { ...x, taken: v } : x)));
    set(taken); // optimistic, so the tick feels instant
    try {
      await setTaken(d.med.id, date!, d.time, taken);
    } catch {
      set(!taken);
    }
  }

  async function takeAll() {
    await Promise.all(due.map((d) => flip(d, true)));
    setToast("Shabaash! Marked as taken ✓");
  }

  async function snooze() {
    const at = await remindLater(15, `💊 Time for ${and([...new Set(due.map((d) => short(d.med.name)))])}`);
    setToast(at ? `Theek hai! I'll remind you at ${at}` : "Couldn't set that reminder. Try again?");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !date) return;
    await addMed({ name: form.name.trim(), dose: form.dose.trim() || null, kind: form.kind, times: form.times });
    setForm({ name: "", dose: "", kind: "supplement", times: ["08:00"] });
    setAdding(false);
    await reload(date);
  }

  return (
    <Screen>
      <TopBar
        right={
          <button onClick={() => setAdding(true)} aria-label="Add a medicine or supplement" className="flex h-10 w-10 items-center justify-center rounded-full bg-teal text-white shadow-teal active:scale-95">
            <IconPlus size={22} />
          </button>
        }
      />
      <div className="mt-3 flex items-center justify-between gap-2">
        <h1 className="font-display text-[29px] leading-tight font-extrabold">Time for Meds, {me.name?.split(" ")[0]}!</h1>
        <IconBell size={26} className="shrink-0" />
      </div>

      <div className="mt-3 flex items-center gap-1">
        <div className="relative h-[150px] w-[150px] shrink-0">
          <div className="absolute inset-2 rounded-full bg-peach" />
          <TwinArt twin={twin} pose="wave" stage={me.current_stage} className="absolute inset-x-0 bottom-1 h-[150px] w-[150px]" />
        </div>
        <Bubble tone="sand" tail="left" className="flex-1 rotate-[1.5deg]">
          <p className="font-display text-[17px] leading-snug font-semibold">{say}</p>
        </Bubble>
      </div>

      {doses.length > 0 && (
        <ul className="mt-5 flex flex-col gap-3" aria-label="Today's doses">
          {doses.map((d) => {
            const isDue = due.includes(d);
            return (
              <li key={`${d.med.id}@${d.time}`}>
                <label
                  className={`flex h-16 cursor-pointer items-center gap-3 rounded-[18px] px-4 transition ${
                    d.taken ? "bg-[#e7ece2] text-ink-soft" : isDue ? "bg-card shadow-[0_0_0_2.5px_#2bb3b0,0_0_22px_rgb(43_179_176/0.35)]" : "bg-card shadow-card"
                  }`}
                >
                  <input type="checkbox" checked={d.taken} onChange={(e) => flip(d, e.target.checked)} className="peer sr-only" />
                  <span
                    aria-hidden
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] border-2 ${d.taken ? "border-[#7fae8a] bg-[#8fbd99] text-white" : isDue ? "border-[#2bb3b0] bg-[#e4f6f5]" : "border-ink-soft bg-white"} peer-focus-visible:ring-2 peer-focus-visible:ring-teal`}
                  >
                    {d.taken && <IconCheck size={18} strokeWidth={3} />}
                  </span>
                  <span className="flex-1 font-display text-[19px] font-semibold">
                    {d.med.name}
                    {d.med.dose && <span className="ml-1 text-[13px] font-medium text-ink-soft">· {d.med.dose}</span>}
                  </span>
                  <span className="text-[14px]">{fmt(d.time)}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-auto flex flex-col gap-3 pt-6">
        {due.length > 0 ? (
          <>
            <Button className="h-16 flex-col gap-0 rounded-full leading-tight" onClick={takeAll}>
              <span>Haan, le liya!</span>
              <span className="text-[14px] font-medium opacity-90">(Done, taken!)</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col gap-0 rounded-full leading-tight" onClick={snooze}>
              <span>15 min baad yaad dilaana</span>
              <span className="text-[14px] font-medium">(Remind me in 15m)</span>
            </Button>
          </>
        ) : (
          <Button variant="outline" className="rounded-full" onClick={() => setAdding(true)}>
            <IconPlus size={20} /> Add a medicine or supplement
          </Button>
        )}
      </div>

      {meds.length > 0 && (
        <section className="mt-6" aria-label="All">
          <h2 className="font-display text-[20px] font-bold">Your list</h2>
          <ul className="mt-2 overflow-hidden rounded-[18px] bg-card shadow-card">
            {meds.map((m) => (
              <li key={m.id} className="flex items-center gap-3 border-b border-[#f3ecdf] px-4 py-3 last:border-0">
                <span aria-hidden>{m.kind === "medicine" ? "💊" : "🌿"}</span>
                <span className="flex-1">
                  <span className="block font-display text-[17px] font-semibold">{m.name}</span>
                  <span className="text-[13px] text-ink-soft">{m.times.map(fmt).join(", ")}{m.dose ? ` · ${m.dose}` : ""}</span>
                </span>
                <button onClick={async () => { await deleteMed(m.id); await reload(date); }} aria-label={`Delete ${m.name}`} className="p-2 text-ink-faint">
                  <IconTrash size={18} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {adding && (
        <Sheet open onClose={() => setAdding(false)} title="Add a medicine or supplement">
          <form onSubmit={save} className="flex flex-col gap-3" aria-label="Add a medicine or supplement">
            <div className="flex gap-2" role="group" aria-label="Type">
              {(["supplement", "medicine"] as const).map((k) => (
                <Chip key={k} selected={form.kind === k} onClick={() => setForm({ ...form, kind: k })} className="h-11 flex-1">
                  {k === "supplement" ? "🌿 Supplement" : "💊 Medicine"}
                </Chip>
              ))}
            </div>
            <label className="font-display text-[15px] font-semibold">Name
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Vitamin D3" maxLength={80}
                className="mt-1 h-12 w-full rounded-[14px] border border-[#e6dcc9] bg-card px-4 font-sans text-[17px] font-normal outline-none focus:border-teal" />
            </label>
            <label className="font-display text-[15px] font-semibold">Dose (optional)
              <input value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} placeholder="e.g. 1 tablet, 60k IU"
                className="mt-1 h-12 w-full rounded-[14px] border border-[#e6dcc9] bg-card px-4 font-sans text-[17px] font-normal outline-none focus:border-teal" />
            </label>
            <fieldset>
              <legend className="font-display text-[15px] font-semibold">Times</legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {form.times.map((t, i) => (
                  <span key={i} className="flex items-center gap-1 rounded-[14px] border border-[#e6dcc9] bg-card px-2">
                    <input type="time" value={t} aria-label={`Time ${i + 1}`} onChange={(e) => setForm({ ...form, times: form.times.map((x, j) => (j === i ? e.target.value : x)) })} className="h-11 bg-transparent outline-none" />
                    {form.times.length > 1 && <button type="button" aria-label={`Remove time ${i + 1}`} onClick={() => setForm({ ...form, times: form.times.filter((_, j) => j !== i) })} className="px-1 text-ink-soft">✕</button>}
                  </span>
                ))}
                {form.times.length < 8 && (
                  <button type="button" onClick={() => setForm({ ...form, times: [...form.times, "20:00"] })} className="h-11 rounded-[14px] border border-dashed border-teal px-3 font-display font-semibold text-teal">+ time</button>
                )}
              </div>
            </fieldset>
            <Button className="mt-2">Save</Button>
          </form>
        </Sheet>
      )}
      {toast && <Toast>{toast}</Toast>}
    </Screen>
  );
}
