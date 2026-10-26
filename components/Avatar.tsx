"use client";

/* eslint-disable @next/next/no-img-element -- signed Storage URLs, not optimizable */

export function Avatar({
  url,
  isPlaceholder,
  size = 260,
  className = "",
}: {
  url?: string;
  isPlaceholder?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      <div
        className="relative animate-float overflow-hidden rounded-[2.5rem]"
        style={{ width: size, height: size * 1.25 }}
      >
        {url ? (
          <img src={url} alt="Your Hoppy avatar" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full animate-pulse rounded-[2.5rem] bg-line" aria-label="Avatar loading" />
        )}
      </div>
      {isPlaceholder && (
        <p className="mt-2 rounded-full bg-card px-3 py-1 text-xs text-ink-soft shadow-sm">
          Demo avatar · your 3D likeness appears once Gemini is connected
        </p>
      )}
    </div>
  );
}
