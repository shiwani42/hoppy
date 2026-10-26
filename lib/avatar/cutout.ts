import sharp from "sharp";

/**
 * Makes a generated image's plain background transparent, so avatars and food
 * stickers sit on any card (Gemini can't output alpha). Flood-fills from the
 * border through pixels close to the background colour, then feathers the edge.
 * Plain JS-compatible TypeScript: scripts/make-art.mjs imports it directly.
 */
export async function cutout(input: Buffer, tolerance = 34, keyColor?: [number, number, number]): Promise<Buffer> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = (i: number) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];

  // Background colour: the median of the border pixels.
  const border: number[][] = [];
  for (let x = 0; x < w; x += 4) border.push(px(x), px((h - 1) * w + x));
  for (let y = 0; y < h; y += 4) border.push(px(y * w), px(y * w + w - 1));
  const bg = keyColor ?? [0, 1, 2].map((c) => border.map((p) => p[c]).sort((a, b) => a - b)[border.length >> 1]);
  const dist = (i: number) => {
    const p = px(i);
    return Math.max(Math.abs(p[0] - bg[0]), Math.abs(p[1] - bg[1]), Math.abs(p[2] - bg[2]));
  };

  const isBg = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  const visit = (i: number) => {
    if (!isBg[i] && dist(i) <= tolerance) {
      isBg[i] = 1;
      queue[tail++] = i;
    }
  };
  for (let x = 0; x < w; x++) {
    visit(x);
    visit((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    visit(y * w);
    visit(y * w + w - 1);
  }
  while (head < tail) {
    const i = queue[head++];
    const x = i % w;
    if (x > 0) visit(i - 1);
    if (x < w - 1) visit(i + 1);
    if (i >= w) visit(i - w);
    if (i < w * (h - 1)) visit(i + w);
  }

  // A vivid key colour (the magenta backdrop) never appears on a person, so also clear it
  // where it's enclosed — between arms and body, under a bent knee.
  const keyed = bg[0] > 180 && bg[2] > 180 && bg[1] < 90;
  if (keyed) for (let i = 0; i < w * h; i++) if (!isBg[i] && dist(i) <= tolerance * 1.4) isBg[i] = 1;

  // Drop specks (confetti, stray marks): keep only islands near the subject's size.
  const label = new Int32Array(w * h);
  const sizes = [0];
  for (let s = 0; s < w * h; s++) {
    if (isBg[s] || label[s]) continue;
    const id = sizes.length;
    let n = 0;
    head = tail = 0;
    label[s] = id;
    queue[tail++] = s;
    while (head < tail) {
      const i = queue[head++];
      n++;
      const x = i % w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (j >= 0 && j < w * h && !isBg[j] && !label[j]) {
          label[j] = id;
          queue[tail++] = j;
        }
      }
    }
    sizes.push(n);
  }
  const keep = Math.max(...sizes) * 0.03;

  const mask = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = isBg[i] || sizes[label[i]] < keep ? 0 : 255;
  // A 1px blur softens the jagged edge without eating into the subject.
  const soft = await sharp(mask, { raw: { width: w, height: h, channels: 1 } }).blur(1).extractChannel(0).raw().toBuffer();
  for (let i = 0; i < w * h; i++) data[i * 4 + 3] = Math.min(data[i * 4 + 3], soft[i]);

  // On a magenta backdrop, the model also lights the subject with a pink-purple rim. Pull that
  // cast out of a band near the edge (skin, lips and clothes further in are left alone).
  if (keyed) {
    const BAND = 24;
    const near = new Uint8Array(w * h).fill(255);
    head = tail = 0;
    for (let i = 0; i < w * h; i++) {
      if (isBg[i]) {
        near[i] = 0;
        queue[tail++] = i;
      }
    }
    while (head < tail) {
      const i = queue[head++];
      const d = near[i] + 1;
      if (d > BAND) continue;
      const x = i % w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (j >= 0 && j < w * h && near[j] > d) {
          near[j] = d;
          queue[tail++] = j;
        }
      }
    }
    for (let i = 0; i < w * h; i++) {
      if (near[i] === 0 || near[i] > BAND) continue;
      const [r, g, b] = [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
      const spill = Math.min(r, b) - g;
      if (spill > 0) {
        const k = 1 - (0.5 * (near[i] - 1)) / BAND; // full at the edge, half at the inner end
        data[i * 4] = r - spill * k;
        data[i * 4 + 2] = b - spill * k;
      }
    }
  }

  // See-through things (a glass of water) show the backdrop through them: neutralise any
  // strongly magenta pixel left inside. Skin, lips and the app's clothes never qualify.
  if (keyed) {
    for (let i = 0; i < w * h; i++) {
      if (data[i * 4 + 3] === 0) continue;
      const [r, g, b] = [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
      if (r - g > 35 && b - g > 35 && Math.abs(r - b) < 70) {
        const m = g + (Math.min(r, b) - g) * 0.25;
        data[i * 4] = m;
        data[i * 4 + 2] = m + 6;
      }
    }
  }

  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

/** True when the image already has a transparent background (all four corners clear). */
export async function isCutOut(input: Buffer): Promise<boolean> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const alpha = (x: number, y: number) => data[(y * w + x) * 4 + 3];
  return [alpha(0, 0), alpha(w - 1, 0), alpha(0, h - 1), alpha(w - 1, h - 1)].every((a) => a < 16);
}
