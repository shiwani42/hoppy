"use client";

/** Shrinks a photo on the phone before upload (spec: images ≤1024px save tokens). */
export async function resizeImage(file: Blob, max = 1024, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not read photo"))), "image/jpeg", quality),
  );
}

/** Average colour of the centre of the face area, used to tint the placeholder avatar. */
export async function sampleSkinTone(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = 24;
  canvas.height = 24;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const w = bitmap.width;
  const h = bitmap.height;
  // A small patch around the cheeks of a typical selfie framing.
  ctx.drawImage(bitmap, w * 0.4, h * 0.42, w * 0.2, h * 0.14, 0, 0, 24, 24);
  bitmap.close();
  const d = ctx.getImageData(0, 0, 24, 24).data;
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) {
    r += d[i];
    g += d[i + 1];
    b += d[i + 2];
  }
  const n = d.length / 4;
  const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}
