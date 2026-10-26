/**
 * A light kolam/rangoli frame: a dot grid along the edges with looping strokes
 * between dots (spec.md > Look and Feel — subtle Indian flavour, no kitsch).
 */
export function KolamBorder({ color = "#0f6e6e", accent = "#e8a317" }: { color?: string; accent?: string }) {
  const W = 360, H = 640, step = 24, inset = 12;
  const dots: [number, number][] = [];
  for (let x = inset; x <= W - inset; x += step) dots.push([x, inset], [x, H - inset]);
  for (let y = inset + step; y < H - inset; y += step) dots.push([inset, y], [W - inset, y]);
  const loopsH = (y: number, dir: 1 | -1) =>
    Array.from({ length: Math.floor((W - 2 * inset) / step) }, (_, k) => {
      const x = inset + k * step;
      return `M${x} ${y} q${step / 2} ${dir * 10} ${step} 0`;
    }).join(" ");
  const loopsV = (x: number, dir: 1 | -1) =>
    Array.from({ length: Math.floor((H - 2 * inset) / step) }, (_, k) => {
      const y = inset + k * step;
      return `M${x} ${y} q${dir * 10} ${step / 2} 0 ${step}`;
    }).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <path d={`${loopsH(inset, 1)} ${loopsH(H - inset, -1)} ${loopsV(inset, 1)} ${loopsV(W - inset, -1)}`} fill="none" stroke={color} strokeWidth="1.2" opacity=".35" />
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 5 === 0 ? 2.4 : 1.6} fill={i % 5 === 0 ? accent : color} opacity={i % 5 === 0 ? 0.9 : 0.5} />
      ))}
    </svg>
  );
}
