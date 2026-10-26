"use client";

/* eslint-disable @next/next/no-img-element -- local object URL preview */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { loadAvatarStages, type AvatarStage } from "@/lib/avatar/client";
import { resizeImage, sampleSkinTone } from "@/lib/image";
import { saveProfile } from "@/lib/profile";
import { apiJson, ensureSession, supabase } from "@/lib/supabase/client";

type Step = "intro" | "preview" | "becoming" | "reveal";

const BECOMING_LINES = [
  "Studying that smile…",
  "Mixing your colours…",
  "Sculpting you in 3D…",
  "Adding a dash of turmeric glow…",
  "Almost you…",
];

/** prd.md > Onboarding (Drip): selfie only, then the reveal, then a name. */
export function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<AvatarStage | null>(null);
  const [line, setLine] = useState(0);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ensureSession().catch(() => setError("Couldn't connect. Check your internet and try again."));
  }, []);

  useEffect(() => {
    if (step !== "becoming") return;
    const t = setInterval(() => setLine((l) => (l + 1) % BECOMING_LINES.length), 1600);
    return () => clearInterval(t);
  }, [step]);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  function pick(file?: File) {
    if (!file) return;
    setError(null);
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    setStep("preview");
  }

  async function becomeMe() {
    if (!photo) return;
    setStep("becoming");
    setError(null);
    try {
      const session = await ensureSession();
      const [small, skin_tone] = await Promise.all([resizeImage(photo), sampleSkinTone(photo)]);
      const selfie_path = `${session.user.id}/selfie-${Date.now()}.jpg`;
      const up = await supabase().storage.from("selfies").upload(selfie_path, small, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      await saveProfile({ selfie_path, skin_tone });
      await apiJson("/api/avatar", { stages: [1] });
      const stages = await loadAvatarStages();
      setAvatar(stages[1] ?? null);
      setStep("reveal");
    } catch (err) {
      console.error(err);
      setError("That didn't work. Let's try the selfie again.");
      setStep("preview");
    }
  }

  async function finish(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await saveProfile({ name: name.trim() });
    // Kick off the other four body stages in the background (prd.md > The Avatar and Body Stages).
    apiJson("/api/avatar", { stages: [2, 3, 4, 5] }).catch(() => {});
    router.replace("/");
  }

  return (
    <main className="flex flex-1 flex-col items-center px-6 pt-14 pb-10 text-center">
      <input ref={cameraInput} type="file" accept="image/*" capture="user" hidden onChange={(e) => pick(e.target.files?.[0])} />
      <input ref={galleryInput} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />

      {step === "intro" && (
        <section className="flex flex-1 flex-col items-center animate-fade-up">
          <p className="font-display text-lg font-semibold text-teal">Hoppy</p>
          <h1 className="mt-10 font-display text-4xl leading-tight font-bold">
            Hey! I&apos;m about to become <span className="text-turmeric">you</span>.
          </h1>
          <p className="mt-4 max-w-xs text-ink-soft">
            One selfie, and I&apos;ll turn into your 3D twin. Everything you eat and do will power me up.
          </p>
          <div className="mt-auto flex w-full flex-col gap-3 pt-12">
            <button onClick={() => cameraInput.current?.click()} className="h-14 rounded-full bg-teal font-display text-lg font-semibold text-white shadow-md active:scale-[.98]">
              Take a selfie
            </button>
            <button onClick={() => galleryInput.current?.click()} className="h-14 rounded-full bg-card font-display text-lg font-semibold text-teal shadow-sm active:scale-[.98]">
              Choose from gallery
            </button>
          </div>
        </section>
      )}

      {step === "preview" && preview && (
        <section className="flex flex-1 flex-col items-center animate-fade-up">
          <h1 className="font-display text-3xl font-bold">Looking good!</h1>
          <img src={preview} alt="Your selfie" className="mt-8 h-72 w-60 rounded-[2rem] object-cover shadow-lg" />
          {error && <p className="mt-4 text-strength">{error}</p>}
          <div className="mt-auto flex w-full flex-col gap-3 pt-10">
            <button onClick={becomeMe} className="h-14 rounded-full bg-teal font-display text-lg font-semibold text-white shadow-md active:scale-[.98]">
              Become me ✨
            </button>
            <button onClick={() => setStep("intro")} className="h-12 font-display font-semibold text-ink-soft">
              Retake
            </button>
          </div>
        </section>
      )}

      {step === "becoming" && (
        <section className="flex flex-1 flex-col items-center justify-center" aria-live="polite">
          <div className="relative h-48 w-48">
            <div className="absolute inset-0 animate-spin rounded-full border-[6px] border-line border-t-turmeric [animation-duration:1.4s]" />
            {preview && <img src={preview} alt="" className="absolute inset-4 h-40 w-40 rounded-full object-cover opacity-80 blur-[1px]" />}
          </div>
          <p key={line} className="mt-8 font-display text-xl font-semibold animate-fade-up">
            {BECOMING_LINES[line]}
          </p>
        </section>
      )}

      {step === "reveal" && (
        <section className="flex flex-1 flex-col items-center">
          <div className="animate-pop">
            <Avatar url={avatar?.url} isPlaceholder={avatar?.is_placeholder} size={220} />
          </div>
          <h1 className="mt-6 font-display text-3xl font-bold animate-fade-up">It&apos;s me… I mean, you!</h1>
          <form onSubmit={finish} className="mt-6 flex w-full flex-col gap-3 animate-fade-up">
            <label htmlFor="name" className="text-ink-soft">What should I call you?</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="given-name"
              maxLength={40}
              placeholder="Your name"
              className="h-14 rounded-2xl border border-line bg-card px-5 text-center text-lg outline-none focus:border-teal"
            />
            <button disabled={!name.trim()} className="h-14 rounded-full bg-teal font-display text-lg font-semibold text-white shadow-md disabled:opacity-40">
              Let&apos;s go
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
