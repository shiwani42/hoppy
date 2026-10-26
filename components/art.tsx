"use client";

/* eslint-disable @next/next/no-img-element -- signed Storage URLs and static art */

import { useEffect, useMemo, useState } from "react";
import { foodArt } from "@/lib/art";
import { loadAvatarPoses, loadAvatarStages, type AvatarPose, type AvatarStage, type PoseKey } from "@/lib/avatar/client";

export type Twin = { stages: Record<number, AvatarStage>; poses: Partial<Record<PoseKey, AvatarPose>> };

let twinCache: Promise<Twin> | null = null;

/** The signed-in user's twin images (stages and poses), loaded once per page load. */
export function loadTwin(fresh = false): Promise<Twin> {
  if (!twinCache || fresh) {
    twinCache = Promise.all([loadAvatarStages(), loadAvatarPoses()]).then(([stages, poses]) => ({ stages, poses }));
  }
  return twinCache;
}

export function useTwin() {
  const [twin, setTwin] = useState<Twin | null>(null);
  useEffect(() => {
    let live = true;
    loadTwin().then((t) => live && setTwin(t)).catch(console.error);
    return () => void (live = false);
  }, []);
  return twin;
}

const UPPER_BODY: PoseKey[] = ["bust", "drink", "wave", "cheer"];

/**
 * One picture of the twin. Uses the pose when it exists, otherwise the current
 * body-stage image (cropped to the upper body for portrait poses).
 */
export function TwinArt({
  twin,
  pose = "bust",
  stage = 1,
  className = "",
  alt = "Your Hoppy twin",
  float,
}: {
  twin: Twin | null;
  pose?: PoseKey | "stage";
  stage?: number;
  className?: string;
  alt?: string;
  float?: boolean;
}) {
  const poseUrl = pose !== "stage" ? twin?.poses[pose]?.url : undefined;
  const stageImg = twin?.stages[stage] ?? twin?.stages[1];
  const anim = float ? "animate-float" : "";
  if (poseUrl) return <img src={poseUrl} alt={alt} className={`object-contain ${anim} ${className}`} draggable={false} />;
  if (stageImg) {
    const crop = pose !== "stage" && UPPER_BODY.includes(pose);
    return crop ? (
      <div className={`overflow-hidden ${anim} ${className}`} role="img" aria-label={alt}>
        <img src={stageImg.url} alt="" className="h-[190%] w-full object-cover object-top" draggable={false} />
      </div>
    ) : (
      <img src={stageImg.url} alt={alt} className={`object-contain ${anim} ${className}`} draggable={false} />
    );
  }
  return <div className={`rounded-full bg-[linear-gradient(90deg,#f1e7d6,#faf3e6,#f1e7d6)] bg-[length:200%_100%] animate-shimmer ${className}`} aria-label="Twin loading" />;
}

/** A round 3D food sticker; dishes without art get their emoji on a sticker disc. */
export function FoodSticker({ foodId, emoji, size = 56, src }: { foodId?: string | null; emoji?: string | null; size?: number; src?: string | null }) {
  const art = src ?? foodArt(foodId);
  if (art) return <img src={art} alt="" width={size} height={size} className="shrink-0 object-contain drop-shadow-[0_4px_6px_rgb(60_40_10/0.18)]" style={{ width: size, height: size }} />;
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full border-[3px] border-white bg-[radial-gradient(circle_at_35%_30%,#fffaf0,#f3e6cf)] shadow-[0_4px_10px_rgb(60_40_10/0.16)]"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {emoji ?? "🍽️"}
    </span>
  );
}

const CONFETTI = ["#e8a317", "#10686a", "#d24848", "#428ed8", "#4d9831", "#f1a858", "#a77bd6", "#00b2bc"];

/** Little paper confetti that drifts out once each time `burst` changes. */
export function Confetti({ burst, count = 26, spread = 150, still }: { burst?: number | string; count?: number; spread?: number; still?: boolean }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        // Resting confetti stays in an arc around the head; a burst flies all ways.
        const a = still ? Math.PI * (1.08 + (i / count) * 0.84) + (i % 3) * 0.05 : (i / count) * Math.PI * 2 + (i % 3) * 0.4;
        const r = spread * (0.55 + ((i * 37) % 45) / 100);
        return {
          left: 50 + Math.cos(a) * (still ? r / 3 : 4),
          top: (still ? 62 : 45) + Math.sin(a) * (still ? r / 2.6 : 4),
          dx: `${Math.cos(a) * r}px`,
          dy: `${Math.sin(a) * r * 0.8 + 40}px`,
          rot: `${(i * 97) % 540}deg`,
          color: CONFETTI[i % CONFETTI.length],
          w: 5 + (i % 3) * 2,
          h: 3 + (i % 2) * 3,
          delay: (i % 6) * 40,
        };
      }),
    [count, spread, still],
  );
  return (
    <div key={burst} aria-hidden className="pointer-events-none absolute inset-0 overflow-visible">
      {pieces.map((p, i) => (
        <span
          key={i}
          className={`absolute rounded-[1px] ${still ? "" : "animate-confetti"}`}
          style={
            {
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.w,
              height: p.h,
              background: p.color,
              transform: still ? `rotate(${p.rot})` : undefined,
              animationDelay: `${p.delay}ms`,
              "--dx": p.dx,
              "--dy": p.dy,
              "--rot": p.rot,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** Scalloped festive medallion with the twin inside and a ribbon (7-Day Streak badge). */
export function Medallion({ label, imageUrl, crop, size = 230 }: { label: string; imageUrl?: string; crop?: boolean; size?: number }) {
  const scallop = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 160; i++) {
      const t = (i / 160) * Math.PI * 2;
      const r = 104 + 7 * Math.cos(10 * t) + 6 * Math.max(0, Math.cos(t * 2)) ** 8;
      pts.push(`${(120 + Math.sin(t) * r).toFixed(1)},${(118 - Math.cos(t) * r).toFixed(1)}`);
    }
    return pts.join(" ");
  }, []);
  const dots = Array.from({ length: 36 }, (_, i) => {
    const t = (i / 36) * Math.PI * 2;
    return [120 + Math.sin(t) * 86, 118 - Math.cos(t) * 86];
  });
  const star = (x: number, y: number, s: number) => `M${x} ${y - s} Q${x + s * 0.2} ${y - s * 0.2} ${x + s} ${y} Q${x + s * 0.2} ${y + s * 0.2} ${x} ${y + s} Q${x - s * 0.2} ${y + s * 0.2} ${x - s} ${y} Q${x - s * 0.2} ${y - s * 0.2} ${x} ${y - s}Z`;
  return (
    <svg viewBox="0 0 240 250" width={size} height={(size * 250) / 240} role="img" aria-label={label}>
      <defs>
        <radialGradient id="med-in" cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor="#1d8a8a" />
          <stop offset="1" stopColor="#0d5d60" />
        </radialGradient>
        <linearGradient id="med-gold" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fbe29a" />
          <stop offset=".55" stopColor="#e2b04a" />
          <stop offset="1" stopColor="#b98522" />
        </linearGradient>
        <clipPath id="med-clip">
          <path d="M42 118 A78 78 0 0 1 198 118 L198 196 L42 196 Z" />
        </clipPath>
      </defs>
      <polygon points={scallop} fill="#17666a" />
      <circle cx="120" cy="118" r="96" fill="#e0614f" />
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2.6 : 1.6} fill="#f6c351" />
      ))}
      <circle cx="120" cy="118" r="78" fill="url(#med-in)" />
      {[
        [70, 80, 6],
        [172, 92, 5],
        [64, 140, 4],
        [176, 146, 6],
        [120, 52, 4],
      ].map(([x, y, s], i) => (
        <path key={i} d={star(x, y, s)} fill="#f6c351" />
      ))}
      <g transform="translate(120 30)" fill="#f2d7a6" opacity=".9">
        <path d="M-6 0h12v4h-12zM-2 -6h4v16h-4z" />
      </g>
      {imageUrl && (
        <g clipPath="url(#med-clip)">
          {crop ? (
            <image href={imageUrl} x="50" y="44" width="140" height="300" preserveAspectRatio="xMidYMin slice" />
          ) : (
            <image href={imageUrl} x="46" y="48" width="148" height="150" preserveAspectRatio="xMidYMax meet" />
          )}
        </g>
      )}
      <g>
        <path d="M14 178 L34 170 L34 206 L14 198 L22 188 Z" fill="#0d4f52" />
        <path d="M226 178 L206 170 L206 206 L226 198 L218 188 Z" fill="#0d4f52" />
        <rect x="30" y="166" width="180" height="38" rx="5" fill="#17666a" stroke="#0d4f52" strokeWidth="2" />
        <text x="120" y="192" textAnchor="middle" fontFamily="var(--font-baloo)" fontWeight="800" fontSize="20" fill="#fff" letterSpacing=".5">
          {label}
        </text>
      </g>
      <g transform="translate(198 40)">
        <path d="M-10 14 L-16 44 L-6 38 L-2 48 L4 18 Z" fill="#d9a73c" />
        <path d="M6 14 L14 42 L4 37 L0 47 L-4 18 Z" fill="#c4902b" />
        <circle r="22" fill="url(#med-gold)" stroke="#f9e3a8" strokeWidth="2" />
        <circle r="15" fill="none" stroke="#fff3cf" strokeWidth="1.5" opacity=".8" />
        <path d="M-8 -10 Q0 -16 8 -10" stroke="#fff" strokeWidth="2" fill="none" opacity=".55" />
      </g>
    </svg>
  );
}

/** The ornate dotted kolam frame around share cards. */
export function KolamFrame({ w = 340, h = 600, color = "#c9a45c" }: { w?: number; h?: number; color?: string }) {
  const inset = 10;
  const step = 14;
  const loops: string[] = [];
  for (let x = inset; x < w - inset - step / 2; x += step) {
    loops.push(`M${x} ${inset + 4} q${step / 2} -8 ${step} 0`, `M${x} ${h - inset - 4} q${step / 2} 8 ${step} 0`);
  }
  for (let y = inset; y < h - inset - step / 2; y += step) {
    loops.push(`M${inset + 4} ${y} q-8 ${step / 2} 0 ${step}`, `M${w - inset - 4} ${y} q8 ${step / 2} 0 ${step}`);
  }
  const corner = (x: number, y: number, sx: number, sy: number) => (
    <g transform={`translate(${x} ${y}) scale(${sx} ${sy})`} fill="none" stroke={color} strokeWidth="1.4">
      <path d="M2 2 C 20 2 26 8 26 26 C 8 26 2 20 2 2 Z" />
      <circle cx="12" cy="12" r="3" fill={color} />
      <path d="M30 6 q6 -6 12 0 M6 30 q-6 6 0 12" />
    </g>
  );
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <path d={loops.join(" ")} fill="none" stroke={color} strokeWidth="1.3" opacity=".9" />
      <rect x={inset + 12} y={inset + 12} width={w - 2 * inset - 24} height={h - 2 * inset - 24} rx="10" fill="none" stroke={color} strokeWidth="1" strokeDasharray="1 5" strokeLinecap="round" opacity=".9" />
      {corner(inset + 6, inset + 6, 1, 1)}
      {corner(w - inset - 6, inset + 6, -1, 1)}
      {corner(inset + 6, h - inset - 6, 1, -1)}
      {corner(w - inset - 6, h - inset - 6, -1, -1)}
    </svg>
  );
}
