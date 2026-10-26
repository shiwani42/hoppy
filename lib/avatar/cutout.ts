import sharp from "sharp";

/**
 * Makes a generated image's plain background transparent, so avatars and food
 * stickers sit on any card (Gemini can't output alpha). Flood-fills from the
 * border through pixels close to the background colour, then feathers the edge.
 * Plain JS-compatible TypeScript: scripts/make-art.mjs imports it directly.
 */
export async function cutout(input: Buffer, tolerance = 34): Promise<Buffer> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = (i: number) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];

  // Background colour: the median of the border pixels.
  const border: number[][] = [];
  for (let x = 0; x < w; x += 4) border.push(px(x), px((h - 1) * w + x));
  for (let y = 0; y < h; y += 4) border.push(px(y * w), px(y * w + w - 1));
  const bg = [0, 1, 2].map((c) => border.map((p) => p[c]).sort((a, b) => a - b)[border.length >> 1]);
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

  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}
