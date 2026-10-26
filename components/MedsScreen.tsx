"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { addMed, deleteMed, loadDoses, loadMeds, setTaken, type Dose, type Med } from "@/lib/meds/client";
import { loadProfile } from "@/lib/profile";
import { dateKey } from "@/lib/stats/today";
import { ensureSession } from "@/lib/supabase/client";

const fmt = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
};

/** prd.md > Medicines and Supplements — today's doses with check-offs, and the list. */
export function MedsScreen() {
  const router = useRouter();
  const [date, setDate] = useState<string | null>(null);
  const [nowHm, setNowHm] = useState("00:00");
  const [doses, setDoses] = useState<Dose[]>([]);
  const [meds, setMeds] = useState<Med[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", dose: "", kind: "supplement" as Med["kind"], times: ["08:00"] });

  const reload = useCallback(async (d: string) => {
    const [ds, ms] = await Promise.all([loadDoses(d), loadMeds()]);
    setDoses(ds);
    setMeds(ms);
  }, []);

  useEffect(() => {
    (async () => {
      await ensureSession();
      if (!(await loadProfile())?.name) return router.replace("/onboarding");
      const now = new Date();
      setNowHm(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
      setDate(dateKey(now));
      await reload(dateKey(now));
      if (!(await loadMeds()).length) setAdding(true);
    })().catch(console.error);
  }, [router, reload]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !date) return;
    await addMed({ name: form.name.trim(), dose: form.dose.trim() || null, kind: form.kind, times: form.times });
    setForm({ name: "", dose: "", kind: "supplement", times: ["08:00"] });
    setAdding(false);
    await reload(date);
  }

  return (
    <main className="flex flex-1 flex-col px-5 pt-6 pb-8">
      <PageHeader
        title="Meds & supplements"
        right={!adding && <button onClick={() => setAdding(true)} aria-label="Add a medicine or supplement" className="flex h-11 w-11 items-center justify-center rounded-full bg-teal text-2xl text-white">+</button>}
      />

      {adding && (
        <form onSubmit={save} className="mt-4 flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-sm" aria-label="Add a medicine or supplement">
          <div className="flex gap-2" role="group" aria-label="Type">
            {(["supplement", "medicine"] as const).map((k) => (
              <button key={k} type="button" aria-pressed={form.kind === k} onClick={() => setForm({ ...form, kind: k })}
                className={`h-11 flex-1 rounded-full font-display font-semibold capitalize ${form.kind === k ? "bg-teal text-white" : "bg-cream"}`}>
                {k === "supplement" ? "🌿 Supplement" : "💊 Medicine"}
              </button>
            ))}
          </div>
          <label className="text-sm text-ink-soft">Name
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Vitamin D3" maxLength={80}
              className="h-12 w-full rounded-2xl border border-line bg-cream px-4 text-lg outline-none focus:border-teal" />
          </label>
          <label className="text-sm text-ink-soft">Dose (optional)
            <input value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} placeholder="e.g. 1 tablet, 60k IU"
              className="h-12 w-full rounded-2xl border border-line bg-cream px-4 text-lg outline-none focus:border-teal" />
          </label>
          <fieldset>
            <legend className="text-sm text-ink-soft">Times</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {form.times.map((t, i) => (
                <span key={i} className="flex items-center gap-1 rounded-2xl bg-cream px-2">
                  <input type="time" value={t} aria-label={`Time ${i + 1}`} onChange={(e) => setForm({ ...form, times: form.times.map((x, j) => (j === i ? e.target.value : x)) })}
                    className="h-11 bg-transparent outline-none" />
                  {form.times.length > 1 && <button type="button" aria-label={`Remove time ${i + 1}`} onClick={() => setForm({ ...form, times: form.times.filter((_, j) => j !== i) })} className="px-1 text-ink-soft">✕</button>}
                </span>
              ))}
              {form.times.length < 8 && (
                <button type="button" onClick={() => setForm({ ...form, times: [...form.times, "20:00"] })} className="h-11 rounded-2xl border border-dashed border-teal px-3 text-teal">+ time</button>
              )}
            </div>
          </fieldset>
          <div className="flex gap-2">
            <button className="h-12 flex-1 rounded-full bg-teal font-display font-semibold text-white">Save</button>
            {meds.length > 0 && <button type="button" onClick={() => setAdding(false)} className="h-12 px-4 text-ink-soft">Cancel</button>}
          </div>
        </form>
      )}

      <section className="mt-6" aria-label="Today">
        <h2 className="font-display text-xl font-bold">Today</h2>
        {doses.length === 0 ? (
          <p className="mt-2 text-ink-soft">Nothing scheduled. Add a medicine or supplement and I&apos;ll remind you.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {doses.map((d) => {
              const overdue = !d.taken && d.time < nowHm;
              return (
                <li key={`${d.med.id}@${d.time}`}>
                  <label className={`flex items-center gap-3 rounded-2xl px-4 py-3 shadow-sm ${d.taken ? "bg-teal-soft" : overdue ? "bg-turmeric/15" : "bg-card"}`}>
                    <input
                      type="checkbox"
                      checked={d.taken}
                      onChange={async (e) => {
                        const taken = e.target.checked;
                        const flip = (v: boolean) =>
                          setDoses((xs) => xs.map((x) => (x.med.id === d.med.id && x.time === d.time ? { ...x, taken: v } : x)));
                        flip(taken); // optimistic, so the tick feels instant
                        try {
                          await setTaken(d.med.id, date!, d.time, taken);
                        } catch {
                          flip(!taken);
                        }
                      }}
                      className="h-6 w-6 accent-[var(--color-teal)]"
                    />
                    <span className="flex-1">
                      <span className="block font-display text-lg font-semibold">{d.med.kind === "medicine" ? "💊" : "🌿"} {d.med.name}</span>
                      <span className="text-sm text-ink-soft">{fmt(d.time)}{d.med.dose ? ` · ${d.med.dose}` : ""}{d.taken ? " · taken ✓" : overdue ? " · due" : ""}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {meds.length > 0 && (
        <section className="mt-6" aria-label="All">
          <h2 className="font-display text-xl font-bold">Your list</h2>
          <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl bg-card">
            {meds.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-4 py-3">
                <span>{m.name} <span className="text-sm text-ink-soft">· {m.times.map(fmt).join(", ")}</span></span>
                <button onClick={async () => { await deleteMed(m.id); await reload(date!); }} aria-label={`Delete ${m.name}`} className="text-sm text-ink-soft">Delete</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
