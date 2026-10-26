/* eslint-disable @next/next/no-img-element -- inlined into the exported PNG */

import { forwardRef } from "react";
import { KolamBorder } from "@/components/KolamBorder";

export type ShareCardData = {
  title: string;
  subtitle: string;
  date: string;
  startUrl?: string;
  nowUrl?: string;
  stageName: string;
  stageNumber: number;
  numbers: { label: string; value: string; unit?: string; color: string }[];
  progress?: { label: string; pct: number } | null;
  badge?: string | null;
};

/**
 * The Strava-style card (prd.md > Daily Share Card): 360×640 CSS px, exported
 * at 3× to 1080×1920 for stories. Avatar then vs now, real numbers, kolam frame.
 */
export const ShareCard = forwardRef<HTMLDivElement, { d: ShareCardData }>(function ShareCard({ d }, ref) {
  const showBoth = d.startUrl && d.nowUrl && d.stageNumber > 1;
  return (
    <div ref={ref} className="relative overflow-hidden bg-cream text-ink" style={{ width: 360, height: 640 }} data-testid="share-card">
      <KolamBorder />
      <div className="absolute inset-[26px] flex flex-col">
        <div className="flex items-center justify-between">
          <p className="font-display text-xl font-extrabold tracking-wide text-teal">HOPPY</p>
          <p className="text-xs text-ink-soft">{d.date}</p>
        </div>
        <h1 className="mt-2 font-display text-[30px] leading-[1.05] font-bold">{d.title}</h1>
        <p className="text-sm text-ink-soft">{d.subtitle}</p>

        <div className="mt-3 flex items-end justify-center gap-3">
          {showBoth && (
            <>
              <figure className="flex w-[88px] flex-col items-center opacity-80">
                <img src={d.startUrl} alt="" className="h-[110px] w-[88px] rounded-2xl object-cover grayscale-[35%]" crossOrigin="anonymous" />
                <figcaption className="mt-1 text-[10px] text-ink-soft">Day 1</figcaption>
              </figure>
              <span className="mb-14 font-display text-2xl text-turmeric" aria-hidden>→</span>
            </>
          )}
          <figure className="relative flex flex-col items-center">
            <div className="absolute -inset-3 rounded-full" style={{ background: "radial-gradient(circle, rgba(232,163,23,.35) 0%, transparent 65%)" }} />
            {d.nowUrl && <img src={d.nowUrl} alt="" className="relative h-[200px] w-[160px] rounded-3xl object-cover" crossOrigin="anonymous" />}
            <figcaption className="relative mt-1 rounded-full bg-teal px-3 py-0.5 text-[11px] font-semibold text-white">
              Stage {d.stageNumber} · {d.stageName}
            </figcaption>
          </figure>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-2">
          {d.numbers.map((n) => (
            <div key={n.label} className="rounded-2xl bg-card px-3 py-2 shadow-sm">
              <dt className="text-[11px] text-ink-soft">{n.label}</dt>
              <dd className="font-display text-[28px] leading-none font-bold" style={{ color: n.color }}>
                {n.value}
                {n.unit && <span className="ml-1 text-sm font-semibold text-ink-soft">{n.unit}</span>}
              </dd>
            </div>
          ))}
        </dl>

        {d.progress && (
          <div className="mt-3">
            <p className="text-xs font-semibold text-teal">{d.progress.label}</p>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-gradient-to-r from-teal to-turmeric" style={{ width: `${Math.max(4, Math.min(100, d.progress.pct))}%` }} />
            </div>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between">
          {d.badge ? <p className="rounded-full bg-turmeric/20 px-3 py-1 text-xs font-semibold">{d.badge}</p> : <span />}
          <p className="text-[10px] text-ink-soft">my avatar · my journey · hoppy</p>
        </div>
      </div>
    </div>
  );
});
