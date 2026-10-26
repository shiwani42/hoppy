// Renders the Hoppy app icons from one SVG. Run: node scripts/make-icons.mjs
import sharp from "sharp";
import { writeFile } from "node:fs/promises";

// A happy bouncing face in teal with a turmeric spark, on chai cream.
const icon = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#fbf6ee"/>
  <g transform="translate(256 270) scale(${1 - pad})">
    <ellipse cx="0" cy="190" rx="120" ry="18" fill="#1f1b16" opacity=".1"/>
    <circle cx="0" cy="0" r="170" fill="#0f6e6e"/>
    <circle cx="-58" cy="-20" r="20" fill="#fbf6ee"/>
    <circle cx="58" cy="-20" r="20" fill="#fbf6ee"/>
    <path d="M -70 48 Q 0 118 70 48" stroke="#fbf6ee" stroke-width="22" fill="none" stroke-linecap="round"/>
    <circle cx="-104" cy="40" r="20" fill="#f4a08a" opacity=".7"/>
    <circle cx="104" cy="40" r="20" fill="#f4a08a" opacity=".7"/>
    <path d="M 120 -190 l 14 34 34 14 -34 14 -14 34 -14 -34 -34 -14 34 -14 z" fill="#e8a317"/>
  </g>
</svg>`;

const out = [
  ["public/icons/icon-192.png", 192, 0],
  ["public/icons/icon-512.png", 512, 0],
  ["public/icons/maskable-512.png", 512, 0.22],
  ["public/icons/apple-touch-icon.png", 180, 0.08],
  ["app/icon.png", 64, 0],
  // app/favicon.ico: magick public/icons/icon-192.png -define icon:auto-resize=48,32,16 app/favicon.ico
];
for (const [path, size, pad] of out) {
  await sharp(Buffer.from(icon(pad))).resize(size, size).png().toFile(path);
}
await writeFile("public/icons/icon.svg", icon(0));
console.log("icons written");
