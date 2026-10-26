"use client";

/* eslint-disable @next/next/no-img-element -- signed Storage URL */

import { useEffect, useRef } from "react";
import { STAGE_BODIES } from "@/lib/ai/prompts";

const COLORS = ["#e8a317", "#0f6e6e", "#d64545", "#f08a24", "#4c9a2a", "#3a8dde"];

/** Canvas confetti burst — no library (spec.md > Look and Feel). */
function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    const w = (c.width = c.offsetWidth * devicePixelRatio);
    const h = (c.height = c.offsetHeight * devicePixelRatio);
    const bits = Array.from({ length: 140 }, () => ({
      x: w / 2, y: h * 0.35, vx: (Math.random() - 0.5) * 22, vy: -Math.random() * 22 - 6,
      s: (Math.random() * 6 + 5) * devicePixelRatio, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
    let frame = 0;
    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const b of bits) {
        b.vy += 0.6; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.r += b.vr;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = b.c;
        ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); ctx.restore();
      }
      if (++frame < 150) raf = requestAnimationFrame(tick);
    };
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) tick();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />;
}

/** Stage-up moment (prd.md > The Avatar and Body Stages). */
export function Celebration({ stage, url, onClose, action }: { stage: number; url?: string; onClose: () => void; action?: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-6" role="dialog" aria-modal="true" aria-label="Stage up">
      <Confetti />
      <div className="relative w-full max-w-sm rounded-[2rem] bg-cream p-6 text-center shadow-2xl animate-pop">
        <p className="font-display text-lg font-semibold text-turmeric">Stage up! 🎉</p>
        {url && <img src={url} alt="" className="mx-auto mt-3 h-64 w-52 rounded-[2rem] object-cover" />}
        <h2 className="mt-4 font-display text-3xl font-bold">You&apos;re now {STAGE_BODIES[stage].name}</h2>
        <p className="mt-2 text-ink-soft">Weeks of strong days did this. Shabaash — I feel it too!</p>
        <div className="mt-5 flex flex-col gap-2">
          {action}
          <button onClick={onClose} className="h-12 rounded-full bg-teal font-display font-semibold text-white">Keep going</button>
        </div>
      </div>
    </div>
  );
}
