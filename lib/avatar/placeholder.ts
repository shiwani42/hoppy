/**
 * Demo avatar used when no GEMINI_API_KEY is set: a simple illustrated character
 * in the user's skin tone whose build changes per body stage. Clearly labeled as a
 * placeholder in the UI; the real avatar is the Gemini 3D likeness.
 */
const BUILD = [
  { torso: 1.3, waist: 1.3, arm: 1.15, face: 1.08 },
  { torso: 1.2, waist: 1.18, arm: 1.1, face: 1.05 },
  { torso: 1.1, waist: 1.05, arm: 1.05, face: 1.02 },
  { torso: 1.06, waist: 0.95, arm: 1.08, face: 1 },
  { torso: 1.04, waist: 0.88, arm: 1.1, face: 0.98 },
];

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s: number) => Math.max(0, Math.min(255, ((n >> s) & 255) + amount));
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

export function placeholderAvatarSvg(stage: number, skinTone = "#c68863") {
  const b = BUILD[Math.min(Math.max(stage, 1), 5) - 1];
  const skin = /^#[0-9a-f]{6}$/i.test(skinTone) ? skinTone : "#c68863";
  const skinDark = shade(skin, -28);
  const cx = 256;
  const tw = 92 * b.torso; // half shoulder width
  const ww = 78 * b.waist; // half waist width
  const aw = 26 * b.arm;
  const fr = 66 * b.face;
  const confident = stage >= 4;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 640">
  <defs>
    <radialGradient id="bg" cx="50%" cy="45%" r="60%">
      <stop offset="0" stop-color="#fffaf2"/><stop offset="1" stop-color="#fbf6ee"/>
    </radialGradient>
    <linearGradient id="tee" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#14807f"/><stop offset="1" stop-color="#0f6e6e"/>
    </linearGradient>
  </defs>

  <ellipse cx="${cx}" cy="606" rx="${120 * b.waist}" ry="14" fill="#1f1b16" opacity=".08"/>
  <!-- legs -->
  <rect x="${cx - ww + 8}" y="430" width="${ww - 14}" height="150" rx="26" fill="#2a2f45"/>
  <rect x="${cx + 6}" y="430" width="${ww - 14}" height="150" rx="26" fill="#2a2f45"/>
  <rect x="${cx - ww}" y="568" width="${ww + 4}" height="30" rx="15" fill="#fff" stroke="#e7ddd0"/>
  <rect x="${cx - 4}" y="568" width="${ww + 4}" height="30" rx="15" fill="#fff" stroke="#e7ddd0"/>
  <!-- arms -->
  <g transform="rotate(${confident ? -14 : 8} ${cx - tw + 6} 262)">
    <rect x="${cx - tw - aw + 10}" y="250" width="${aw * 1.6}" height="168" rx="${aw * 0.8}" fill="${skin}"/>
    <rect x="${cx - tw - aw + 6}" y="246" width="${aw * 1.8}" height="64" rx="${aw * 0.8}" fill="url(#tee)"/>
  </g>
  <g transform="rotate(${confident ? 14 : -8} ${cx + tw - 6} 262)">
    <rect x="${cx + tw - aw * 0.6 - 10}" y="250" width="${aw * 1.6}" height="168" rx="${aw * 0.8}" fill="${skin}"/>
    <rect x="${cx + tw - aw * 0.8 - 6}" y="246" width="${aw * 1.8}" height="64" rx="${aw * 0.8}" fill="url(#tee)"/>
  </g>
  <!-- torso -->
  <path d="M ${cx - tw} 270 Q ${cx - tw} 236 ${cx - tw + 40} 232 L ${cx + tw - 40} 232 Q ${cx + tw} 236 ${cx + tw} 270
           L ${cx + ww} 440 Q ${cx} 458 ${cx - ww} 440 Z" fill="url(#tee)"/>
  <path d="M ${cx - 26} 232 Q ${cx} 262 ${cx + 26} 232" fill="${skinDark}"/>
  <!-- neck + head -->
  <rect x="${cx - 22}" y="196" width="44" height="44" rx="14" fill="${skinDark}"/>
  <circle cx="${cx}" cy="${150}" r="${fr}" fill="${skin}"/>
  <path d="M ${cx - fr - 2} ${150} Q ${cx - fr} ${150 - fr - 18} ${cx} ${150 - fr - 10}
           Q ${cx + fr} ${150 - fr - 18} ${cx + fr + 2} ${150} Q ${cx + fr - 10} ${120} ${cx + 20} ${108}
           Q ${cx - 30} ${126} ${cx - fr - 2} ${150} Z" fill="#231a14"/>
  <circle cx="${cx - 24}" cy="${158}" r="7" fill="#231a14"/>
  <circle cx="${cx + 24}" cy="${158}" r="7" fill="#231a14"/>
  <circle cx="${cx - 21}" cy="${155}" r="2.2" fill="#fff"/>
  <circle cx="${cx + 27}" cy="${155}" r="2.2" fill="#fff"/>
  <ellipse cx="${cx - 40}" cy="${178}" rx="11" ry="6" fill="#e86a5a" opacity=".28"/>
  <ellipse cx="${cx + 40}" cy="${178}" rx="11" ry="6" fill="#e86a5a" opacity=".28"/>
  <path d="M ${cx - 18} ${184} Q ${cx} ${confident ? 202 : 196} ${cx + 18} ${184}" stroke="#7a3b2e" stroke-width="5" fill="none" stroke-linecap="round"/>
</svg>`;
}
