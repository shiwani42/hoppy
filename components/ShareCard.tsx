/* eslint-disable @next/next/no-img-element -- inlined into the exported PNG */

import { forwardRef } from "react";
import { KolamFrame } from "@/components/art";

type Portrait = { url?: string; label: string; sub: string };

export type ShareCardData = {
  title: string;
  subtitle: string;
  date: string;
  start: Portrait;
  now: Portrait;
  heading: string;
  lines: string[];
  badge: string;
};

function Frame({ p, glow }: { p: Portrait; glow?: boolean }) {
  return (
    <figure className="flex w-[124px] flex-col items-center">
      <div className={`flex h-[200px] w-[124px] items-end justify-center overflow-hidden rounded-[16px] ${glow ? "bg-[radial-gradient(circle_at_50%_40%,#fde9c6,#f3cf95)]" : "bg-[radial-gradient(circle_at_50%_40%,#f6ecdc,#e9dac2)]"}`}>
        {p.url && <img src={p.url} alt="" className="h-[92%] object-contain" crossOrigin="anonymous" />}
      </div>
      <figcaption className="mt-1.5 text-center leading-tight">
        <span className="block font-display text-[16px] font-bold">{p.label}</span>
        <span className="text-[11px] text-ink-soft">{p.sub}</span>
      </figcaption>
    </figure>
  );
}

/**
 * The Strava-style card (images/…3rrn…png, right): 360×640 CSS px, exported at 3×
 * to 1080×1920 for stories. Kolam frame, Day 1 vs now, today's real numbers.
 */
export const ShareCard = forwardRef<HTMLDivElement, { d: ShareCardData }>(function ShareCard({ d }, ref) {
  return (
    <div ref={ref} className="relative overflow-hidden bg-cream text-ink" style={{ width: 360, height: 640 }} data-testid="share-card">
      <KolamFrame w={360} h={640} />
      <div className="absolute inset-[34px] flex flex-col items-center text-center">
        <h1 className="mt-5 font-display text-[25px] leading-tight font-extrabold">{d.title}</h1>
        <p className="text-[13px] text-ink-soft">({d.subtitle})</p>

        <div className="mt-6 flex items-center gap-2">
          <Frame p={d.start} />
          <span className="mb-10 flex h-9 w-9 items-center justify-center rounded-full bg-card font-display text-[15px] font-extrabold shadow-card">vs.</span>
          <Frame p={d.now} glow />
        </div>

        <p className="mt-7 font-display text-[21px] font-extrabold">{d.heading}</p>
        {d.lines.map((l) => (
          <p key={l} className="font-display text-[17px] leading-snug font-semibold">{l}</p>
        ))}

        <p className="mt-6 rounded-full bg-saffron-soft px-4 py-1.5 font-display text-[14px] font-bold text-[#7a4e12]">{d.badge}</p>

        <div className="mt-auto flex w-full items-center justify-between text-[10px] text-ink-soft">
          <span className="font-display text-[14px] font-extrabold tracking-wide text-teal">HOPPY</span>
          <span>{d.date} · my twin, my journey</span>
        </div>
      </div>
    </div>
  );
});
