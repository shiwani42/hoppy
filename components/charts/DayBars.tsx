/** Daily bars with an optional target line — tiny inline SVG, no chart library. */
export function DayBars({
  values,
  target,
  color,
  label,
  unit,
}: {
  values: (number | null)[];
  target?: number | null;
  color: string;
  label: string;
  unit: string;
}) {
  const W = 300, H = 72;
  const max = Math.max(1, target ?? 0, ...values.map((v) => v ?? 0)) * 1.1;
  const bw = W / Math.max(values.length, 1);
  const y = (v: number) => H - (v / max) * H;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-[72px] w-full" role="img" aria-label={`${label} per day`}>
        {values.map((v, i) =>
          v == null ? (
            <rect key={i} x={i * bw + bw * 0.15} y={H - 2} width={bw * 0.7} height={2} fill="var(--color-line)" />
          ) : (
            <rect key={i} x={i * bw + bw * 0.15} y={y(v)} width={bw * 0.7} height={H - y(v)} rx={Math.min(3, bw * 0.3)} fill={color} opacity={0.85} />
          ),
        )}
        {target ? <line x1={0} x2={W} y1={y(target)} y2={y(target)} stroke="var(--color-ink)" strokeDasharray="4 4" strokeWidth={1} opacity={0.4} /> : null}
      </svg>
      <figcaption className="sr-only">
        {label}: {values.map((v) => (v == null ? "no data" : `${Math.round(v)} ${unit}`)).join(", ")}
      </figcaption>
    </figure>
  );
}

/** Weight trend line with start/end labels. */
export function WeightLine({ points }: { points: { date: string; kg: number }[] }) {
  if (points.length < 2) return <p className="text-sm text-ink-soft">Log your weight a few times to see the trend.</p>;
  const W = 300, H = 90, pad = 8;
  const ks = points.map((p) => Number(p.kg));
  const lo = Math.min(...ks) - 0.5, hi = Math.max(...ks) + 0.5;
  const x = (i: number) => pad + (i / (points.length - 1)) * (W - 2 * pad);
  const y = (k: number) => pad + ((hi - k) / (hi - lo)) * (H - 2 * pad);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i)} ${y(Number(p.kg))}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[90px] w-full" role="img" aria-label={`Weight from ${ks[0]} to ${ks.at(-1)} kg`}>
      <path d={d} fill="none" stroke="var(--color-teal)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => <circle key={p.date} cx={x(i)} cy={y(Number(p.kg))} r={2.5} fill="var(--color-teal)" />)}
      <text x={pad} y={H - 1} fontSize="10" fill="var(--color-ink-soft)">{ks[0]} kg</text>
      <text x={W - pad} y={H - 1} fontSize="10" fill="var(--color-ink-soft)" textAnchor="end">{ks.at(-1)} kg</text>
    </svg>
  );
}
