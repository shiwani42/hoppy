"use client";

import { useState } from "react";

/** Stat-sheet footer: log last night's sleep or today's weight any time. */
export function QuickLog({
  sleepHours,
  weightKg,
  onSleep,
  onWeight,
}: {
  sleepHours: number | null;
  weightKg: number | null;
  onSleep: (h: number) => Promise<void>;
  onWeight: (kg: number) => Promise<void>;
}) {
  const [open, setOpen] = useState<"sleep" | "weight" | null>(null);
  const [val, setVal] = useState("");
  const n = Number(val);
  const valid = open === "sleep" ? n >= 0 && n <= 16 && val !== "" : n >= 20 && n <= 350;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    await (open === "sleep" ? onSleep(n) : onWeight(n));
    setOpen(null);
    setVal("");
  }

  return (
    <div className="mt-4">
      {!open ? (
        <div className="flex gap-2">
          <button onClick={() => { setOpen("sleep"); setVal(String(sleepHours ?? 7)); }} className="h-12 flex-1 rounded-full bg-card font-display font-semibold text-rest shadow-sm">
            😴 {sleepHours == null ? "Log sleep" : `Sleep: ${sleepHours} h`}
          </button>
          <button onClick={() => { setOpen("weight"); setVal(weightKg ? String(weightKg) : ""); }} className="h-12 flex-1 rounded-full bg-card font-display font-semibold text-teal shadow-sm">
            ⚖️ {weightKg ? `${weightKg} kg` : "Log weight"}
          </button>
        </div>
      ) : (
        <form onSubmit={save} className="flex items-end gap-2 rounded-3xl bg-card p-3 shadow-sm">
          <label className="flex-1 text-sm text-ink-soft">
            {open === "sleep" ? "Hours slept last night" : "Today's weight (kg)"}
            <input autoFocus type="number" step={open === "sleep" ? 0.5 : 0.1} inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)}
              className="h-12 w-full rounded-2xl border border-line bg-cream px-4 text-lg outline-none focus:border-teal" />
          </label>
          <button disabled={!valid} className="h-12 rounded-full bg-teal px-5 font-display font-semibold text-white disabled:opacity-40">Save</button>
          <button type="button" onClick={() => setOpen(null)} className="h-12 px-2 text-ink-soft">Cancel</button>
        </form>
      )}
    </div>
  );
}
