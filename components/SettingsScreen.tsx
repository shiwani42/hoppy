"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TwinArt, loadTwin, useTwin } from "@/components/art";
import { Button, Chip, Loading, Toast, Toggle, TopBar } from "@/components/ui";
import { saveWeight } from "@/lib/logs/client";
import { resizeImage, sampleSkinTone } from "@/lib/image";
import { loadProfile, saveProfile, type Profile } from "@/lib/profile";
import { disablePush, enablePush, hasPushSubscription, pushSupported } from "@/lib/push/client";
import type { ReminderRow } from "@/lib/reminders/due";
import { ensureDefaultReminders, loadReminders, saveReminder } from "@/lib/reminders/client";
import { dateKey } from "@/lib/stats/today";
import { api, apiJson, ensureSession, supabase } from "@/lib/supabase/client";

const field = "mt-1 h-12 w-full rounded-[14px] border border-[#e6dcc9] bg-card px-4 font-sans text-[17px] font-normal text-ink outline-none focus:border-teal";
const card = "flex flex-col gap-3 rounded-[22px] border border-[#f1e8d8] bg-card p-4 shadow-card";
const lbl = "font-display text-[15px] font-semibold text-ink-soft";
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
  const twin = useTwin();

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
      await apiJson("/api/avatar", { stages: [1, 2, 3, 4, 5], poses: ["bust"] });
      apiJson("/api/avatar", { poses: ["drink", "stretch", "walk", "wave", "cheer"] }).catch(() => {});
      await loadTwin(true);
      flash("New twin ready ✨");
    } catch (err) {
      console.error(err);
      flash("Couldn't make the avatar. Try another photo?");
    } finally {
      setAvatarBusy(false);
    }
  }

  if (!form || !profile) return <Loading label="Settings…" />;

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-10">
      <TopBar />
      <h1 className="font-display text-[34px] leading-tight font-extrabold">Settings</h1>
      {saved && <Toast>{saved}</Toast>}

      <section className={`${card} flex-row items-center`} aria-label="Avatar">
        <div className="relative h-[96px] w-[96px] shrink-0 overflow-hidden rounded-full bg-peach">
          <TwinArt twin={twin} pose="bust" stage={profile.current_stage} className="absolute inset-x-0 -bottom-1 h-[104px] w-[96px]" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-[20px] font-bold">Your twin</h2>
          <input ref={selfie} type="file" accept="image/*" capture="user" hidden onChange={(e) => retake(e.target.files?.[0])} data-testid="retake-input" />
          <button disabled={avatarBusy} onClick={() => selfie.current?.click()} className="mt-1 font-display text-[16px] font-semibold text-teal disabled:opacity-50">
            {avatarBusy ? "Becoming you again…" : "📸 Retake selfie & regenerate"}
          </button>
        </div>
      </section>

      <form onSubmit={saveAbout} className={card} aria-label="About you">
        <h2 className="font-display text-[20px] font-bold">About you</h2>
        <label className={lbl}>Name<input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <div className="flex gap-2">
          <label className={`flex-1 ${lbl}`}>Height (cm)<input className={field} type="number" inputMode="numeric" value={form.height_cm} onChange={(e) => setForm({ ...form, height_cm: e.target.value })} /></label>
          <label className={`flex-1 ${lbl}`}>Weight (kg)<input className={field} type="number" step="0.1" inputMode="decimal" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} /></label>
        </div>
        <div className="flex gap-2">
          <label className={`flex-1 ${lbl}`}>Birth year<input className={field} type="number" inputMode="numeric" value={form.birth_year} onChange={(e) => setForm({ ...form, birth_year: e.target.value })} /></label>
          <label className={`flex-1 ${lbl}`}>Goal (kg)<input className={field} type="number" step="0.1" inputMode="decimal" value={form.goal_weight_kg} onChange={(e) => setForm({ ...form, goal_weight_kg: e.target.value })} /></label>
        </div>
        <div className="flex gap-2" role="group" aria-label="Sex (for the calorie formula)">
          {(["female", "male"] as const).map((s) => (
            <Chip key={s} selected={form.sex === s} onClick={() => setForm({ ...form, sex: s })} className="h-11 flex-1 capitalize">{s}</Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Diet type">
          {DIETS.map(([v, label]) => (
            <Chip key={v} selected={form.diet_type === v} onClick={() => setForm({ ...form, diet_type: v })}>{label}</Chip>
          ))}
        </div>
        <Button size="md">Save</Button>
      </form>

      <section className={card} aria-label="Reminders">
        <h2 className="font-display text-[20px] font-bold">Reminders</h2>
        {push === "unsupported" ? (
          <p className="text-ink-soft">This browser can&apos;t do notifications. Install Hoppy to your home screen, or I&apos;ll show reminders inside the app.</p>
        ) : push === "denied" ? (
          <p className="text-ink-soft">Notifications are blocked for Hoppy. Allow them in your browser&apos;s site settings — until then I&apos;ll remind you inside the app.</p>
        ) : push === "failed" ? (
          <>
            <p className="text-ink-soft">I couldn&apos;t reach this device&apos;s notification service. Your reminders are saved and I&apos;ll show them inside the app.</p>
            <Button size="md" variant="outline" onClick={togglePush}>Try again</Button>
          </>
        ) : (
          <Button size="md" variant={push === "on" ? "soft" : "primary"} onClick={togglePush}>
            {push === "on" ? "Turn off notifications" : "🔔 Turn on reminders"}
          </Button>
        )}
        {push === "on" && (
          <button onClick={async () => { const r = await (await api("/api/push/test", { method: "POST" })).json(); flash(r.sent ? "Test sent — check your notifications" : "Couldn't reach this device"); }}
            className="h-11 rounded-[14px] border-2 border-teal font-display font-semibold text-teal">Send me a test</button>
        )}
        {reminders.length > 0 && (
          <ul className="flex flex-col gap-2">
            {reminders.sort((a, b) => a.time.localeCompare(b.time)).map((r) => (
              <li key={r.meal_type} className="flex items-center gap-3 rounded-[16px] bg-cream px-4 py-2">
                <Toggle on={r.enabled} label={`${MEAL_LABEL[r.meal_type]} reminder`}
                  onChange={async (enabled) => { const next = { ...r, enabled }; setReminders((xs) => xs.map((x) => (x.meal_type === r.meal_type ? next : x))); await saveReminder(next); }} />
                <span className="flex-1 font-display text-[18px] font-semibold">{MEAL_LABEL[r.meal_type]}</span>
                <input type="time" value={r.time} aria-label={`${MEAL_LABEL[r.meal_type]} reminder time`} className="h-10 rounded-[10px] bg-card px-2"
                  onChange={async (e) => { const next = { ...r, time: e.target.value }; setReminders((xs) => xs.map((x) => (x.meal_type === r.meal_type ? next : x))); await saveReminder(next); }} />
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-3 rounded-[16px] bg-cream px-4 py-2">
          <Toggle on={profile.water_reminders} label="Water reminders" onChange={async (on) => setProfile(await saveProfile({ water_reminders: on }))} />
          <span className="flex-1 font-display text-[18px] font-semibold">Water 💧</span>
          <span className="text-[13px] text-ink-soft">5 times a day</span>
        </div>
        <p className="text-[13px] text-ink-soft">Medicine reminders follow the times on your Meds list.</p>
      </section>

    </main>
  );
}
