"use client";

/* eslint-disable @next/next/no-img-element -- local object URL preview */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Screen } from "@/components/ui";
import { resizeImage, sampleSkinTone } from "@/lib/image";
import { saveProfile } from "@/lib/profile";
import { apiJson, ensureSession, supabase } from "@/lib/supabase/client";

type Step = "intro" | "preview" | "making" | "name";

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

/** prd.md > Onboarding (Drip): a selfie and a name, then straight in — the twin is made in the background. */
export function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ensureSession().catch(() => setError("Couldn't connect. Check your internet and try again."));
  }, []);

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
    setStep("making");
    setError(null);
    try {
      const session = await ensureSession();
      const [small, skin_tone] = await Promise.all([resizeImage(photo), sampleSkinTone(photo)]);
      const selfie_path = `${session.user.id}/selfie-${Date.now()}.jpg`;
      const up = await supabase().storage.from("selfies").upload(selfie_path, small, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      await saveProfile({ selfie_path, skin_tone });
      // The twin is made in the background (about half a minute): the portrait first,
      // then body stage 1 drawn to match it. Nobody waits — Home shows it arriving.
      await apiJson("/api/avatar", { poses: ["bust"], stages: [1], background: true });
      setStep("name");
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
          {preview && <img src={preview} alt="" className="h-40 w-40 rounded-full object-cover opacity-80" />}
          <p className="mt-6 font-display text-[22px] font-bold">Saving your photo…</p>
        </section>
      )}

      {step === "name" && (
        <section className="flex w-full flex-1 flex-col items-center animate-fade-up">
          <div className="relative mt-8 h-44 w-44">
            <div className="absolute inset-0 animate-spin rounded-full [animation-duration:2.4s] [background:conic-gradient(from_0deg,#10686a,#e2b04a,#10686a00_70%)]" />
            <div className="absolute inset-[6px] rounded-full bg-cream" />
            {preview && <img src={preview} alt="" className="absolute inset-3 h-[152px] w-[152px] rounded-full object-cover" />}
          </div>
          <p className="mt-4 text-[15px] text-ink-soft">Your 3D twin is being made — it&apos;ll appear on your home screen.</p>
          <h1 className="mt-6 font-display text-[32px] font-extrabold">What&apos;s your name?</h1>
          <form onSubmit={finish} className="mt-5 flex w-full flex-col gap-3">
            <input
              id="name"
              aria-label="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="given-name"
              autoFocus
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
