"use client";

/* eslint-disable @next/next/no-img-element -- signed Storage URLs, not optimizable */

/** Today's mood from overall vitality (0–1), shown as a small badge. */
export function moodFor(v: number) {
  if (v >= 0.8) return { emoji: "🤩", label: "glowing" };
  if (v >= 0.5) return { emoji: "😄", label: "energised" };
  if (v >= 0.2) return { emoji: "🙂", label: "warming up" };
  return { emoji: "😴", label: "sleepy" };
}

/**
 * The avatar, with a day-level feel (prd.md > The Avatar and Body Stages):
 * a turmeric glow and livelier colour as today's stats fill, and a little
 * bounce when it reacts to a log.
 */
export function Avatar({
  url,
  isPlaceholder,
  size = 260,
  className = "",
  vitality,
  reacting,
  onClick,
}: {
  url?: string;
  isPlaceholder?: boolean;
  size?: number;
  className?: string;
  vitality?: number;
  reacting?: boolean;
  onClick?: () => void;
}) {
  const v = Math.max(0, Math.min(1, vitality ?? 0.5));
  const mood = vitality === undefined ? null : moodFor(v);
  const Wrapper = onClick ? "button" : "div";
  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      <Wrapper
        {...(onClick ? { onClick, "aria-label": `Your avatar is ${mood?.label ?? "here"}. Tap to see today's stats`, type: "button" as const } : {})}
        className="relative rounded-[2.5rem] transition-transform active:scale-[.98]"
        style={{ width: size, height: size * 1.25 }}
      >
        <div
          aria-hidden
          className="absolute -inset-6 rounded-full transition-opacity duration-700"
          style={{ background: "radial-gradient(circle, var(--color-turmeric) 0%, transparent 65%)", opacity: 0.08 + v * 0.45 }}
        />
        <div className={`relative h-full w-full overflow-hidden rounded-[2.5rem] ${reacting ? "animate-pop" : "animate-float"}`}>
          {url ? (
            <img
              src={url}
              alt="Your Hoppy avatar"
              className="h-full w-full object-cover transition-[filter] duration-700"
              style={{ filter: `saturate(${0.75 + v * 0.45}) brightness(${0.94 + v * 0.1})` }}
            />
          ) : (
            <div className="h-full w-full animate-pulse rounded-[2.5rem] bg-line" aria-label="Avatar loading" />
          )}
        </div>
        {mood && (
          <span className="absolute -right-1 bottom-6 flex h-11 w-11 items-center justify-center rounded-full bg-card text-2xl shadow-md" aria-hidden>
            {mood.emoji}
          </span>
        )}
      </Wrapper>
      {isPlaceholder && (
        <p className="mt-2 rounded-full bg-card px-3 py-1 text-xs text-ink-soft shadow-sm">
          Demo avatar · your 3D likeness appears once Gemini is connected
        </p>
      )}
    </div>
  );
}
