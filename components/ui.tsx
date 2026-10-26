"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";
import { IconBack } from "@/components/icons";

/**
 * The shared look of every screen, copied from the reference designs
 * (images/Gemini_Generated_Image_*.png): cream page, heavy Baloo titles, white
 * rounded cards, teal buttons, outlined pill chips.
 */

export function Screen({ children, className = "", ...rest }: ComponentProps<"main">) {
  return (
    <main {...rest} className={`flex flex-1 flex-col px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] ${className}`}>
      {children}
    </main>
  );
}

export function BackButton({ href, label = "Back", dark }: { href?: string; label?: string; dark?: boolean }) {
  const router = useRouter();
  const cls = `flex h-10 w-10 shrink-0 items-center justify-center rounded-full active:scale-95 ${dark ? "bg-white/10 text-cream" : "border border-line bg-card text-ink shadow-[0_1px_2px_rgb(60_40_10/0.06)]"}`;
  if (href) {
    return (
      <Link href={href} aria-label={label} className={cls}>
        <IconBack />
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} onClick={() => (history.length > 1 ? router.back() : router.push("/"))} className={cls}>
      <IconBack />
    </button>
  );
}

/** Top row: back on the left, an optional action on the right. */
export function TopBar({ back = true, backHref, right, dark }: { back?: boolean; backHref?: string; right?: ReactNode; dark?: boolean }) {
  return (
    <div className="flex h-10 items-center justify-between">
      {back ? <BackButton href={backHref} dark={dark} /> : <span />}
      {right ?? <span />}
    </div>
  );
}

export function Title({
  children,
  sub,
  align = "left",
  className = "",
}: {
  children: ReactNode;
  sub?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <header className={`${align === "center" ? "text-center" : ""} ${className}`}>
      <h1 className="font-display text-[32px] leading-[1.08] font-extrabold tracking-[-0.01em] text-ink">{children}</h1>
      {sub && <p className="mt-1 text-[16px] leading-snug text-ink-soft">{sub}</p>}
    </header>
  );
}

export function Card({ children, className = "", ...rest }: ComponentProps<"div">) {
  return (
    <div {...rest} className={`rounded-[22px] border border-[#f1e8d8] bg-card shadow-card ${className}`}>
      {children}
    </div>
  );
}

type Variant = "primary" | "ghost" | "outline" | "soft" | "gold" | "aqua" | "dark";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-teal text-white shadow-teal active:bg-teal-deep",
  ghost: "text-ink-faint",
  outline: "border-2 border-teal bg-card text-teal",
  soft: "bg-teal-soft text-teal",
  gold: "bg-[linear-gradient(180deg,#efe3cd,#d9c6a2)] text-ink shadow-[0_8px_18px_rgb(120_90_30/0.22)]",
  aqua: "bg-aqua text-white shadow-[0_8px_20px_rgb(0_178_188/0.3)]",
  dark: "bg-ink text-cream",
};

export function buttonClass(variant: Variant = "primary", size: "lg" | "md" | "sm" = "lg") {
  const h = size === "lg" ? "h-14 text-[19px] rounded-[16px]" : size === "md" ? "h-12 text-[17px] rounded-[14px]" : "h-10 text-[15px] rounded-full px-4";
  return `inline-flex w-full items-center justify-center gap-2 font-display font-bold transition-transform active:scale-[.98] disabled:opacity-40 disabled:active:scale-100 ${h} ${VARIANTS[variant]}`;
}

export function Button({ variant = "primary", size = "lg", className = "", ...rest }: ComponentProps<"button"> & { variant?: Variant; size?: "lg" | "md" | "sm" }) {
  return <button {...rest} className={`${buttonClass(variant, size)} ${className}`} />;
}

export function ButtonLink({ variant = "primary", size = "lg", className = "", ...rest }: ComponentProps<typeof Link> & { variant?: Variant; size?: "lg" | "md" | "sm" }) {
  return <Link {...rest} className={`${buttonClass(variant, size)} ${className}`} />;
}

export function Chip({
  selected,
  tone = "teal",
  className = "",
  ...rest
}: ComponentProps<"button"> & { selected?: boolean; tone?: "teal" | "gold" | "rose" | "plain" }) {
  const on =
    tone === "gold"
      ? "border-transparent bg-[linear-gradient(180deg,#e8c77d,#d4a548)] text-white shadow-[0_6px_14px_rgb(180_130_30/0.3)]"
      : tone === "rose"
        ? "border-transparent bg-[#f6c9c9] text-[#8c2f2f]"
        : "border-teal bg-teal text-white shadow-[0_6px_14px_rgb(16_104_106/0.25)]";
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...rest}
      className={`inline-flex h-10 shrink-0 items-center justify-center rounded-full border px-4 font-display text-[16px] font-semibold whitespace-nowrap transition active:scale-95 ${selected ? on : "border-[#e4d8c4] bg-card text-ink"} ${className}`}
    />
  );
}

/** Speech bubble. `tail` points at whoever is speaking. */
export function Bubble({
  children,
  tone = "white",
  tail = "left",
  className = "",
}: {
  children: ReactNode;
  tone?: "white" | "sand" | "teal";
  tail?: "left" | "right" | "bottom-left" | "none";
  className?: string;
}) {
  const bg = tone === "sand" ? "#efe7d8" : tone === "teal" ? "var(--color-teal)" : "#ffffff";
  const text = tone === "teal" ? "text-white" : "text-ink";
  return (
    <div className={`relative rounded-[20px] px-4 py-3 shadow-card ${text} ${className}`} style={{ background: bg }}>
      {children}
      {tail !== "none" && (
        <svg
          aria-hidden
          width="18"
          height="16"
          viewBox="0 0 18 16"
          className={`absolute ${tail === "left" ? "-left-2.5 top-1/2 -translate-y-1/2" : tail === "right" ? "-right-2.5 top-1/2 -translate-y-1/2 -scale-x-100" : "-bottom-3 left-8 rotate-[-90deg]"}`}
        >
          <path d="M18 0 C10 6 6 8 0 8 C6 8 10 10 18 16 Z" fill={bg} />
        </svg>
      )}
    </div>
  );
}

export function ProgressBar({
  value,
  color = "var(--color-ink)",
  track = "#e6dccb",
  height = 10,
  knob,
  label,
}: {
  value: number;
  color?: string;
  track?: string;
  height?: number;
  knob?: boolean;
  label?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)} className="relative w-full rounded-full" style={{ height, background: track }}>
      <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${Math.max(v, height / 3)}%`, background: color }} />
      {knob && (
        <span
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-[linear-gradient(180deg,#f0d59a,#c9a45c)] shadow-[0_2px_8px_rgb(120_90_30/0.35)] transition-[left] duration-700"
          style={{ left: `${v}%`, width: height * 2.4, height: height * 2.4 }}
        />
      )}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${on ? "bg-teal" : "bg-[#e2dccf]"}`}
    >
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-[left] ${on ? "left-7" : "left-1"}`} />
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-[12px] bg-[#ece3d1] p-1">
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`h-10 min-w-16 rounded-[9px] px-4 font-display text-[17px] font-semibold transition ${value === v ? "bg-card text-ink shadow-sm" : "text-ink-soft"}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ value, tabs, onChange }: { value: T; tabs: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="flex border-b border-line">
      {tabs.map(([v, text]) => (
        <button
          key={v}
          role="tab"
          aria-selected={value === v}
          onClick={() => onChange(v)}
          className={`relative h-12 flex-1 font-display text-[18px] transition ${value === v ? "font-bold text-teal" : "font-medium text-ink-soft"}`}
        >
          {text}
          {value === v && <span className="absolute inset-x-3 -bottom-px h-[3px] rounded-full bg-teal" />}
        </button>
      ))}
    </div>
  );
}

export function Toast({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="fixed inset-x-5 top-5 z-[60] mx-auto max-w-sm rounded-2xl bg-ink px-4 py-3 text-center text-[15px] text-cream shadow-lift animate-fade-up">
      {children}
    </div>
  );
}

export function Loading({ label = "Hoppy…" }: { label?: string }) {
  return <main className="flex flex-1 items-center justify-center font-display text-xl text-ink-soft">{label}</main>;
}
