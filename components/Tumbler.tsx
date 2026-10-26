"use client";

/**
 * Water tumbler (prd.md > Water Tumbler): tap to add a glass; the glass
 * fills toward today's target.
 */
export function Tumbler({
  ml,
  target,
  glassMl = 250,
  onAdd,
  onUndo,
}: {
  ml: number;
  target: number;
  glassMl?: number;
  onAdd: () => void;
  onUndo: () => void;
}) {
  const f = Math.max(0, Math.min(1, ml / target));
  const top = 14, bottom = 86; // inner glass y-range in the 64×100 viewBox
  const y = bottom - f * (bottom - top);
  return (
    <div className="flex flex-col items-center">
      <button
        onClick={onAdd}
        aria-label={`Add a glass of water (${glassMl} ml). ${(ml / 1000).toFixed(2)} of ${(target / 1000).toFixed(1)} litres today`}
        className="relative active:scale-95 transition-transform"
      >
        <svg viewBox="0 0 64 100" width="46" height="72" aria-hidden>
          <defs>
            <clipPath id="glass">
              <path d="M10 12 L54 12 L48 88 Q47 92 43 92 L21 92 Q17 92 16 88 Z" />
            </clipPath>
          </defs>
          <g clipPath="url(#glass)">
            <rect x="0" y="0" width="64" height="100" fill="#eaf3fb" />
            <rect x="0" y={y} width="64" height={100 - y} fill="var(--color-hydration)" className="transition-all duration-700" />
            <path d={`M0 ${y} q8 -3 16 0 t16 0 t16 0 t16 0 V${y + 4} H0 Z`} fill="#ffffff" opacity=".35" />
          </g>
          <path d="M10 12 L54 12 L48 88 Q47 92 43 92 L21 92 Q17 92 16 88 Z" fill="none" stroke="#9cc4ea" strokeWidth="3" strokeLinejoin="round" />
        </svg>
        <span className="absolute -right-2 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-hydration text-sm font-bold text-white shadow">+</span>
      </button>
      <p className="mt-1 text-xs font-semibold text-hydration">{(ml / 1000).toFixed(1)} / {(target / 1000).toFixed(1)} L</p>
      {ml > 0 && (
        <button onClick={onUndo} className="text-xs text-ink-soft underline-offset-2 hover:underline" aria-label="Remove last glass">
          undo
        </button>
      )}
    </div>
  );
}
