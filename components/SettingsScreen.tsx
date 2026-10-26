"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { saveWeight } from "@/lib/logs/client";
import { resizeImage, sampleSkinTone } from "@/lib/image";
import { loadProfile, saveProfile, type Profile } from "@/lib/profile";
import { disablePush, enablePush, hasPushSubscription, pushSupported } from "@/lib/push/client";
import type { ReminderRow } from "@/lib/reminders/due";
import { ensureDefaultReminders, loadReminders, saveReminder } from "@/lib/reminders/client";
import { dateKey } from "@/lib/stats/today";
import { api, apiJson, ensureSession, supabase } from "@/lib/supabase/client";

const field = "h-12 w-full rounded-2xl border border-line bg-cream px-4 text-lg outline-none focus:border-teal";
const DIETS = [["veg", "Veg"], ["egg", "Veg + egg"], ["non-veg", "Non-veg"], ["jain", "Jain"], ["vegan", "Vegan"]] as const;
const MEAL_LABEL: Record<string, string> = { breakfast: "Breakfast", lunch: "Lunch", snack: "Snack", dinner: "Dinner" };

type Form = { name: string; height_cm: string; weight_kg: string; birth_year: string; sex: string; goal_weight_kg: string; diet_type: string };

const toForm = (p: Profile): Form => ({
  name: p.name ?? "",
  height_cm: p.height_cm?.toString() ?? "",
  weight_kg: p.weight_kg?.toString() ?? "",
  birth_year: p.birth_year?.toString() ?? "",
  sex: p.sex ?? "",
  goal_weight_kg: p.goal_weight_kg?.toString() ?? "",
  diet_type: p.diet_type ?? "",
});

/**
 * Settings (spec.md > Settings): edit what drip onboarding collected, turn on
 * reminders, and retake the avatar selfie.
 */
export function SettingsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [push, setPush] = useState<"on" | "off" | "denied" | "unsupported" | "failed">("off");
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const selfie = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      await ensureSession();
      const p = await loadProfile();
      if (!p?.name) return router.replace("/onboarding");
      setProfile(p);
      setForm(toForm(p));
      setReminders(await loadReminders());
      if (!pushSupported()) setPush("unsupported");
      else if (Notification.permission === "denied") setPush("denied");
      else setPush((await hasPushSubscription()) ? "on" : "off");
    })().catch(console.error);
  }, [router]);

  function flash(msg: string) {
    setSaved(msg);
    setTimeout(() => setSaved(null), 2500);
  }

  async function saveAbout(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !profile) return;
    const num = (v: string) => (v.trim() ? Number(v) : null);
    let p = profile;
    const weight = num(form.weight_kg);
    if (weight && weight !== profile.weight_kg) p = await saveWeight(dateKey(), weight);
    p = await saveProfile({
      name: form.name.trim() || profile.name,
      height_cm: num(form.height_cm),
      birth_year: num(form.birth_year),
      sex: (form.sex || null) as Profile["sex"],
      goal_weight_kg: num(form.goal_weight_kg),
      diet_type: (form.diet_type || null) as Profile["diet_type"],
      ...(num(form.goal_weight_kg) && !p.start_weight_kg ? { start_weight_kg: p.weight_kg } : {}),
    });
    setProfile(p);
    flash("Saved ✓");
  }

  async function togglePush() {
    if (push === "on") {
      await disablePush();
      setPush("off");
      return;
    }
    // Meal reminders exist either way: without push they show inside the app.
    setReminders(await ensureDefaultReminders());
    await saveProfile({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    const result = await enablePush().catch((err) => {
      console.warn("push subscribe failed", err);
      return "failed" as const;
    });
    setPush(result === "granted" ? "on" : result);
    if (result === "granted") flash("Reminders are on 🎉");
  }

  async function retake(file?: File) {
    if (!file || !profile) return;
    setAvatarBusy(true);
    try {
      const [small, skin_tone] = await Promise.all([resizeImage(file), sampleSkinTone(file)]);
      const selfie_path = `${profile.user_id}/selfie-${Date.now()}.jpg`;
      const up = await supabase().storage.from("selfies").upload(selfie_path, small, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      setProfile(await saveProfile({ selfie_path, skin_tone }));
      await apiJson("/api/avatar", { stages: [1, 2, 3, 4, 5] });
      flash("New avatar ready ✨");
    } catch (err) {
      console.error(err);
      flash("Couldn't make the avatar. Try another photo?");
    } finally {
      setAvatarBusy(false);
    }
  }

  if (!form || !profile) return <main className="flex flex-1 items-center justify-center font-display text-xl text-ink-soft">Settings…</main>;

  return (
    <main className="flex flex-1 flex-col gap-6 px-5 pt-6 pb-10">
      <PageHeader title="Settings" />
      {saved && <p role="status" className="fixed inset-x-5 top-5 z-50 mx-auto max-w-md rounded-2xl bg-ink px-4 py-3 text-center text-cream shadow-lg">{saved}</p>}

      <form onSubmit={saveAbout} className="flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-sm" aria-label="About you">
        <h2 className="font-display text-xl font-bold">About you</h2>
        <label className="text-sm text-ink-soft">Name<input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <div className="flex gap-2">
          <label className="flex-1 text-sm text-ink-soft">Height (cm)<input className={field} type="number" inputMode="numeric" value={form.height_cm} onChange={(e) => setForm({ ...form, height_cm: e.target.value })} /></label>
          <label className="flex-1 text-sm text-ink-soft">Weight (kg)<input className={field} type="number" step="0.1" inputMode="decimal" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} /></label>
        </div>
        <div className="flex gap-2">
          <label className="flex-1 text-sm text-ink-soft">Birth year<input className={field} type="number" inputMode="numeric" value={form.birth_year} onChange={(e) => setForm({ ...form, birth_year: e.target.value })} /></label>
          <label className="flex-1 text-sm text-ink-soft">Goal weight (kg)<input className={field} type="number" step="0.1" inputMode="decimal" value={form.goal_weight_kg} onChange={(e) => setForm({ ...form, goal_weight_kg: e.target.value })} /></label>
        </div>
        <div className="flex gap-2" role="group" aria-label="Sex (for the calorie formula)">
          {(["female", "male"] as const).map((s) => (
            <button key={s} type="button" aria-pressed={form.sex === s} onClick={() => setForm({ ...form, sex: s })}
              className={`h-11 flex-1 rounded-full font-display font-semibold capitalize ${form.sex === s ? "bg-teal text-white" : "bg-cream"}`}>{s}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Diet type">
          {DIETS.map(([v, label]) => (
            <button key={v} type="button" aria-pressed={form.diet_type === v} onClick={() => setForm({ ...form, diet_type: v })}
              className={`h-10 rounded-full px-4 font-display font-semibold ${form.diet_type === v ? "bg-teal text-white" : "bg-cream"}`}>{label}</button>
          ))}
        </div>
        <button className="h-12 rounded-full bg-teal font-display font-semibold text-white">Save</button>
      </form>

      <section className="flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-sm" aria-label="Reminders">
        <h2 className="font-display text-xl font-bold">Reminders</h2>
        {push === "unsupported" ? (
          <p className="text-ink-soft">This browser can&apos;t do notifications. Install Hoppy to your home screen, or I&apos;ll show reminders inside the app.</p>
        ) : push === "denied" ? (
          <p className="text-ink-soft">Notifications are blocked for Hoppy. Allow them in your browser&apos;s site settings — until then I&apos;ll remind you inside the app.</p>
        ) : push === "failed" ? (
          <>
            <p className="text-ink-soft">I couldn&apos;t reach this device&apos;s notification service. Your reminders are saved and I&apos;ll show them inside the app.</p>
            <button onClick={togglePush} className="h-11 rounded-full border border-teal font-display font-semibold text-teal">Try again</button>
          </>
        ) : (
          <button onClick={togglePush} className={`h-12 rounded-full font-display font-semibold ${push === "on" ? "bg-cream text-ink" : "bg-teal text-white"}`}>
            {push === "on" ? "Turn off notifications" : "🔔 Turn on reminders"}
          </button>
        )}
        {push === "on" && (
          <button onClick={async () => { const r = await (await api("/api/push/test", { method: "POST" })).json(); flash(r.sent ? "Test sent — check your notifications" : "Couldn't reach this device"); }}
            className="h-11 rounded-full border border-teal font-display font-semibold text-teal">Send me a test</button>
        )}
        {reminders.length > 0 && (
          <ul className="flex flex-col gap-2">
            {reminders.sort((a, b) => a.time.localeCompare(b.time)).map((r) => (
              <li key={r.meal_type} className="flex items-center gap-3 rounded-2xl bg-cream px-4 py-2">
                <label className="flex flex-1 items-center gap-3">
                  <input type="checkbox" checked={r.enabled} className="h-5 w-5 accent-[var(--color-teal)]"
                    onChange={async (e) => { const next = { ...r, enabled: e.target.checked }; setReminders((xs) => xs.map((x) => (x.meal_type === r.meal_type ? next : x))); await saveReminder(next); }} />
                  <span className="font-display text-lg font-semibold">{MEAL_LABEL[r.meal_type]}</span>
                </label>
                <input type="time" value={r.time} aria-label={`${MEAL_LABEL[r.meal_type]} reminder time`} className="h-10 rounded-xl bg-card px-2"
                  onChange={async (e) => { const next = { ...r, time: e.target.value }; setReminders((xs) => xs.map((x) => (x.meal_type === r.meal_type ? next : x))); await saveReminder(next); }} />
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-ink-soft">Medicine reminders follow the times on your Meds list.</p>
      </section>

      <section className="flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-sm" aria-label="Avatar">
        <h2 className="font-display text-xl font-bold">Your avatar</h2>
        <input ref={selfie} type="file" accept="image/*" capture="user" hidden onChange={(e) => retake(e.target.files?.[0])} data-testid="retake-input" />
        <button disabled={avatarBusy} onClick={() => selfie.current?.click()} className="h-12 rounded-full bg-cream font-display font-semibold text-teal disabled:opacity-50">
          {avatarBusy ? "Becoming you again…" : "📸 Retake selfie & regenerate"}
        </button>
      </section>
    </main>
  );
}
