"use client";

/* eslint-disable @next/next/no-img-element -- local object URL preview */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Confetti, TwinArt, loadTwin, type Twin } from "@/components/art";
import { Button, Screen } from "@/components/ui";
import { resizeImage, sampleSkinTone } from "@/lib/image";
import { saveProfile } from "@/lib/profile";
import { apiJson, ensureSession, supabase } from "@/lib/supabase/client";

type Step = "intro" | "preview" | "becoming" | "reveal";

const BECOMING_LINES = ["Studying that smile…", "Mixing your colours…", "Sculpting you in 3D…", "Adding a dash of turmeric glow…", "Almost you…"];

/** prd.md > Onboarding (Drip): a selfie only, then the reveal, then a name. Everything else comes later. */
export function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [twin, setTwin] = useState<Twin | null>(null);
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
      // The first body stage and the portrait the home screen shows.
      await apiJson("/api/avatar", { stages: [1], poses: ["bust"] });
      setTwin(await loadTwin(true));
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
    // The other four body stages and the poses render in the background (prd.md > The Avatar and Body Stages).
    apiJson("/api/avatar", { stages: [2, 3, 4, 5] }).catch(() => {});
    apiJson("/api/avatar", { poses: ["drink", "stretch", "walk", "wave", "cheer"] }).catch(() => {});
    router.replace("/");
  }

  return (
    <Screen className="items-center text-center">
      <input ref={cameraInput} type="file" accept="image/*" capture="user" hidden onChange={(e) => pick(e.target.files?.[0])} />
      <input ref={galleryInput} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />

      {step === "intro" && (
        <section className="flex w-full flex-1 flex-col items-center animate-fade-up">
          <p className="mt-4 font-display text-[18px] font-extrabold tracking-wide text-teal">HOPPY</p>
          <h1 className="mt-3 font-display text-[34px] leading-[1.1] font-extrabold">Namaste! I&apos;m about to become <span className="text-turmeric">you</span>.</h1>
          <div className="relative mt-6 h-[250px] w-[250px]">
            <Confetti still count={18} spread={170} />
            <div className="absolute inset-4 rounded-full bg-[radial-gradient(circle_at_50%_40%,#fbe7c4,#f3cf95)]" />
            <img src="/art/demo/bust.png" alt="An example Hoppy twin" className="absolute inset-x-6 bottom-0 h-[250px] w-[200px] object-contain animate-float" />
            <span className="absolute -right-2 bottom-6 rounded-full bg-card px-3 py-1 font-display text-[13px] font-bold shadow-card">example twin</span>
          </div>
          <p className="mt-5 max-w-[300px] text-[17px] leading-snug text-ink-soft">
            One selfie and I turn into your 3D twin. Everything you eat, drink and do powers me up.
          </p>
          <div className="mt-auto flex w-full flex-col gap-2 pt-8">
            <Button onClick={() => cameraInput.current?.click()}>Take a selfie</Button>
            <button onClick={() => galleryInput.current?.click()} className="h-12 font-display text-[18px] font-semibold text-teal">
              Choose from gallery
            </button>
            <p className="text-[13px] text-ink-soft">No forms, no sign-up — just a selfie to start.</p>
          </div>
        </section>
      )}

      {step === "preview" && preview && (
        <section className="flex w-full flex-1 flex-col items-center animate-fade-up">
          <h1 className="mt-8 font-display text-[34px] font-extrabold">Looking good!</h1>
          <img src={preview} alt="Your selfie" className="mt-8 h-[300px] w-[240px] rounded-[28px] object-cover shadow-lift" />
          {error && <p className="mt-4 text-strength">{error}</p>}
          <div className="mt-auto flex w-full flex-col gap-2 pt-8">
            <Button onClick={becomeMe}>Become me ✨</Button>
            <button onClick={() => setStep("intro")} className="h-12 font-display text-[18px] font-semibold text-ink-faint">Retake</button>
          </div>
        </section>
      )}

      {step === "becoming" && (
        <section className="flex flex-1 flex-col items-center justify-center" aria-live="polite">
          <div className="relative h-56 w-56">
            <div className="absolute inset-0 animate-spin rounded-full [animation-duration:1.6s] [background:conic-gradient(from_0deg,#10686a,#e2b04a,#10686a00_70%)]" />
            <div className="absolute inset-[7px] rounded-full bg-cream" />
            {preview && <img src={preview} alt="" className="absolute inset-4 h-48 w-48 rounded-full object-cover opacity-85" />}
          </div>
          <p key={line} className="mt-8 font-display text-[22px] font-bold animate-fade-up">{BECOMING_LINES[line]}</p>
        </section>
      )}

      {step === "reveal" && (
        <section className="flex w-full flex-1 flex-col items-center">
          <div className="relative mt-6 h-[260px] w-[260px] animate-pop">
            <Confetti burst={1} count={34} spread={200} />
            <div className="absolute inset-4 rounded-full bg-[radial-gradient(circle_at_50%_40%,#fbe7c4,#f3cf95)]" />
            <TwinArt twin={twin} pose="bust" stage={1} className="absolute inset-x-6 bottom-0 h-[260px] w-[210px]" />
          </div>
          {twin?.stages[1]?.is_placeholder && (
            <p className="mt-2 rounded-full bg-card px-3 py-1 text-[12px] text-ink-soft shadow-card">Demo twin · your 3D likeness appears once Gemini is connected</p>
          )}
          <h1 className="mt-5 font-display text-[32px] font-extrabold animate-fade-up">It&apos;s me… I mean, you!</h1>
          <form onSubmit={finish} className="mt-5 flex w-full flex-col gap-3 animate-fade-up">
            <label htmlFor="name" className="font-display text-[18px] font-semibold text-ink-soft">What should I call you?</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="given-name"
              maxLength={40}
              placeholder="Your name"
              className="h-14 rounded-[16px] border border-[#e6dcc9] bg-card px-5 text-center text-[19px] outline-none focus:border-teal"
            />
            <Button disabled={!name.trim()}>Let&apos;s go</Button>
          </form>
        </section>
      )}
    </Screen>
  );
}
