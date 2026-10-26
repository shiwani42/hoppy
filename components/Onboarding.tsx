"use client";

/* eslint-disable @next/next/no-img-element -- local object URL preview */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Confetti, TwinArt, loadTwin, type Twin } from "@/components/art";
import { Button, Screen } from "@/components/ui";
import { resizeImage, sampleSkinTone } from "@/lib/image";
import { saveProfile } from "@/lib/profile";
import { apiJson, ensureSession, supabase } from "@/lib/supabase/client";

type Step = "intro" | "preview" | "making" | "reveal";

const MAKING_STEPS = ["Reading your photo", "Shaping your 3D twin", "Adding the finishing touches"];

/** A selfie face guide: viewfinder corners and a dashed head-and-shoulders outline. */
function FaceGuide() {
  return (
    <svg viewBox="0 0 220 260" className="h-[250px] w-[212px]" aria-hidden>
      <rect x="6" y="6" width="208" height="248" rx="34" fill="#fff" stroke="#efe6d6" strokeWidth="2" />
      {["M12 52 V40 a28 28 0 0 1 28 -28 H52", "M168 12 H180 a28 28 0 0 1 28 28 V52", "M208 208 V220 a28 28 0 0 1 -28 28 H168", "M52 248 H40 a28 28 0 0 1 -28 -28 V208"].map((d) => (
        <path key={d} d={d} fill="none" stroke="var(--color-teal)" strokeWidth="5" strokeLinecap="round" />
      ))}
      <ellipse cx="110" cy="112" rx="52" ry="66" fill="none" stroke="#cdbf9f" strokeWidth="2.5" strokeDasharray="6 7" />
      <path d="M46 226 C58 192 82 180 110 180 C138 180 162 192 174 226" fill="none" stroke="#cdbf9f" strokeWidth="2.5" strokeDasharray="6 7" />
    </svg>
  );
}

/** prd.md > Onboarding (Drip): a selfie only, then the twin, then a name. Everything else comes later. */
export function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [twin, setTwin] = useState<Twin | null>(null);
  const [done, setDone] = useState(0);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ensureSession().catch(() => setError("Couldn't connect. Check your internet and try again."));
  }, []);

  // The steps tick along while the image is made (about half a minute).
  useEffect(() => {
    if (step !== "making") return;
    const t = setInterval(() => setDone((d) => Math.min(MAKING_STEPS.length - 1, d + 1)), 7000);
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

  async function makeTwin() {
    if (!photo) return;
    setDone(0);
    setStep("making");
    setError(null);
    try {
      const session = await ensureSession();
      const [small, skin_tone] = await Promise.all([resizeImage(photo), sampleSkinTone(photo)]);
      const selfie_path = `${session.user.id}/selfie-${Date.now()}.jpg`;
      const up = await supabase().storage.from("selfies").upload(selfie_path, small, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      await saveProfile({ selfie_path, skin_tone });
      // The portrait comes first; every later image is drawn to match it.
      await apiJson("/api/avatar", { poses: ["bust"] });
      let tw = await loadTwin(true);
      // No image model set up: the labeled placeholder (body stage 1) stands in.
      if (!tw.poses.bust) {
        await apiJson("/api/avatar", { stages: [1] });
        tw = await loadTwin(true);
      }
      setTwin(tw);
      setStep("reveal");
    } catch (err) {
      console.error(err);
      setError("That didn't work. Try the photo again?");
      setStep("preview");
    }
  }

  async function finish(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await saveProfile({ name: name.trim() });
    // Body stages and the other poses render in the background, matched to the portrait.
    apiJson("/api/avatar", { stages: twin?.stages[1] ? [2, 3, 4, 5] : [1, 2, 3, 4, 5] }).catch(() => {});
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
          <h1 className="mt-6 font-display text-[34px] leading-tight font-extrabold">Take a selfie</h1>
          <p className="mt-2 max-w-[290px] text-[17px] leading-snug text-ink-soft">We&apos;ll turn it into your 3D twin.</p>
          <div className="mt-8">
            <FaceGuide />
          </div>
          <p className="mt-4 text-[14px] text-ink-soft">Good light · face the camera · no sunglasses</p>
          <div className="mt-auto flex w-full flex-col gap-2 pt-8">
            <Button onClick={() => cameraInput.current?.click()}>Take a selfie</Button>
            <button onClick={() => galleryInput.current?.click()} className="h-12 font-display text-[18px] font-semibold text-teal">
              Choose from gallery
            </button>
          </div>
        </section>
      )}

      {step === "preview" && preview && (
        <section className="flex w-full flex-1 flex-col items-center animate-fade-up">
          <h1 className="mt-8 font-display text-[32px] font-extrabold">Use this photo?</h1>
          <img src={preview} alt="Your selfie" className="mt-8 h-[300px] w-[240px] rounded-[28px] object-cover shadow-lift" />
          {error && <p className="mt-4 text-strength">{error}</p>}
          <div className="mt-auto flex w-full flex-col gap-2 pt-8">
            <Button onClick={makeTwin}>Use photo</Button>
            <button onClick={() => setStep("intro")} className="h-12 font-display text-[18px] font-semibold text-ink-faint">Retake</button>
          </div>
        </section>
      )}

      {step === "making" && (
        <section className="flex flex-1 flex-col items-center justify-center" aria-live="polite">
          <div className="relative h-56 w-56">
            <div className="absolute inset-0 animate-spin rounded-full [animation-duration:1.6s] [background:conic-gradient(from_0deg,#10686a,#e2b04a,#10686a00_70%)]" />
            <div className="absolute inset-[7px] rounded-full bg-cream" />
            {preview && <img src={preview} alt="" className="absolute inset-4 h-48 w-48 rounded-full object-cover opacity-85" />}
          </div>
          <p className="mt-8 font-display text-[24px] font-bold">Creating your twin…</p>
          <ol className="mt-3 flex flex-col items-start gap-1 text-[16px]">
            {MAKING_STEPS.map((t, i) => (
              <li key={t} className={`flex items-center gap-2 transition-colors ${i < done ? "text-teal" : i === done ? "text-ink" : "text-ink-faint"}`}>
                <span aria-hidden className="w-4">{i < done ? "✓" : "•"}</span> {t}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[13px] text-ink-soft">This takes about half a minute.</p>
        </section>
      )}

      {step === "reveal" && (
        <section className="flex w-full flex-1 flex-col items-center">
          <div className="relative mt-6 h-[260px] w-[260px] animate-pop">
            <Confetti burst={1} count={30} spread={190} />
            <div className="absolute inset-4 rounded-full bg-[radial-gradient(circle_at_50%_40%,#fbe7c4,#f3cf95)]" />
            <TwinArt twin={twin} pose="bust" stage={1} className="absolute inset-x-6 bottom-0 h-[260px] w-[210px]" />
          </div>
          {!twin?.poses.bust && (
            <p className="mt-2 rounded-full bg-card px-3 py-1 text-[12px] text-ink-soft shadow-card">Placeholder · your 3D twin appears once image generation is set up</p>
          )}
          <h1 className="mt-5 font-display text-[32px] font-extrabold animate-fade-up">Your twin is ready</h1>
          <form onSubmit={finish} className="mt-5 flex w-full flex-col gap-3 animate-fade-up">
            <label htmlFor="name" className="font-display text-[18px] font-semibold text-ink-soft">What&apos;s your name?</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="given-name"
              maxLength={40}
              placeholder="Your name"
              className="h-14 rounded-[16px] border border-[#e6dcc9] bg-card px-5 text-center text-[19px] outline-none focus:border-teal"
            />
            <Button disabled={!name.trim()}>Continue</Button>
          </form>
        </section>
      )}
    </Screen>
  );
}
