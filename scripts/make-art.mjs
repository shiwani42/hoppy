// Generates Hoppy's static art (food stickers, expert photos, demo people) with
// OpenAI images, or Gemini when only GEMINI_API_KEY is set.
// Run: node scripts/make-art.mjs [group…] [--force]
// Groups: food, experts, demo. Updates public/art/manifest.json. Existing files are kept unless --force.
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import sharp from "sharp";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { cutout, isCutOut } from "../lib/avatar/cutout.ts";

const FOODS = JSON.parse(await readFile("data/indian-foods.json", "utf8")).foods;

// .env.local wins over the shell: a stale exported OPENAI_API_KEY must not shadow it.
const env = { ...process.env };
for (const line of (await readFile(".env.local", "utf8")).split("\n")) {
  const i = line.indexOf("=");
  const v = line.slice(i + 1).trim();
  if (i > 0 && !line.startsWith("#") && v) env[line.slice(0, i).trim()] = v;
}
const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
const gemini = env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }) : null;
if (!openai && !gemini) {
  console.error("Add OPENAI_API_KEY (or GEMINI_API_KEY) to .env.local first.");
  process.exit(1);
}
// Flare: OpenAI's fast, high-volume image model — right for one-off stickers and photos (≈ $0.013 each at medium).
const OPENAI_MODEL = env.OPENAI_ART_MODEL ?? "gpt-image-2.5-flare";
const GEMINI_MODEL = env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image-preview";
const force = process.argv.includes("--force");
const groups = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const STICKER =
  "A single glossy 3D food sticker illustration, soft clay render, warm studio light, " +
  "seen from a 3/4 top angle, centred, filling 80% of the frame, isolated on a plain white (or transparent) background, " +
  "no shadow on the background, no text, no plate border cut off. Dish: ";

const PHOTO =
  "Professional head-and-shoulders portrait photo, natural soft window light, warm neutral " +
  "background, friendly confident smile, looking at the camera, shallow depth of field. ";

/** [file, prompt, options] — options.cutout makes the white background transparent. */
const ART = {
  // One sticker per dish in the food list, named by food id.
  food: FOODS.map((f) => [`public/art/food/${f.id}.png`, STICKER + f.name.toLowerCase(), { cutout: true, size: 384 }]),

  experts: [
    ["dr-ananya-rao", "Indian woman in her early 40s, clinical dietitian in a white coat with a stethoscope, hair tied back"],
    ["vikram-singh", "Indian man in his mid 30s, strength and yoga coach in a plain rust-orange t-shirt, short beard"],
    ["priya-nair", "South Indian woman in her 30s, nutritionist in a smart teal kurta"],
    ["sunil-joshi", "Indian man in his 50s, yoga teacher in a white cotton kurta, calm expression, grey stubble"],
    ["dr-farah-siddiqui", "Indian woman in her late 30s, dietitian in a white coat over a maroon top, wearing a soft headscarf"],
    ["kavya-iyer", "South Indian woman in her late 20s, nutritionist in a mustard top, small bindi"],
    ["arjun-singh", "Sikh Indian man in his 40s, running coach in a sports t-shirt, neat navy turban and beard"],
    ["meera-desai", "Indian woman in her late 50s, gentle yoga teacher in a pastel cotton saree, silver hair in a bun"],
  ].map(([f, who]) => [`public/art/experts/${f}.jpg`, PHOTO + who, { size: 320 }]),

  demo: [
    [
      "scripts/demo/selfie-suresh.jpg",
      "A casual smartphone selfie photo of a friendly 52-year-old Indian man named Suresh, grey hair, " +
        "short grey stubble beard, warm smile, wearing a teal polo shirt, at home in soft daylight. Photorealistic.",
      { size: 768 },
    ],
    [
      "scripts/demo/selfie-priya.jpg",
      "A casual smartphone selfie photo of a cheerful 45-year-old Indian woman, shoulder-length black hair, " +
        "small bindi, wearing a coral kurta, at home in soft daylight. Photorealistic.",
      { size: 768 },
    ],
    [
      "scripts/demo/selfie-amit.jpg",
      "A casual smartphone selfie photo of a 48-year-old Indian man with a neat black moustache and short black hair, " +
        "wearing a checked shirt, outdoors in a park in morning light. Photorealistic.",
      { size: 768 },
    ],
    [
      "scripts/demo/selfie-rajesh.jpg",
      "A casual smartphone selfie photo of a 58-year-old Indian man, balding with grey sides, rimless glasses, " +
        "wearing a white kurta, on a balcony in soft daylight. Photorealistic.",
      { size: 768 },
    ],
    [
      "public/art/sample-meal.jpg",
      "Overhead food photo of a home-cooked Indian lunch on a dark slate table: a copper bowl of yellow dal, " +
        "white basmati rice, a green bowl of dry aloo gobi sabzi, a roti and a steel spoon. Natural light, appetising.",
      { size: 1024 },
    ],
  ],
};

async function generate(prompt, opts) {
  if (openai) {
    const res = await openai.images.generate({
      model: OPENAI_MODEL,
      prompt,
      size: "1024x1024",
      quality: "medium",
      background: opts.cutout ? "transparent" : "opaque",
      output_format: "png",
    });
    return Buffer.from(res.data[0].b64_json, "base64");
  }
  const res = await gemini.models.generateContent({ model: GEMINI_MODEL, contents: [{ role: "user", parts: [{ text: prompt }] }] });
  const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part) throw new Error("no image returned");
  return Buffer.from(part.inlineData.data, "base64");
}

/** Runs `fn` over `items`, a few at a time, to stay inside image rate limits. */
async function pool(items, size, fn) {
  const queue = [...items];
  await Promise.all(Array.from({ length: size }, async () => {
    while (queue.length) await fn(queue.shift());
  }));
}

for (const [group, items] of Object.entries(ART)) {
  if (groups.length && !groups.includes(group)) continue;
  await pool(items, 4, async ([out, prompt, opts]) => {
      if (existsSync(out) && !force) return;
      await mkdir(dirname(out), { recursive: true });
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          let img = await generate(prompt, opts);
          if (opts.cutout && !(await isCutOut(img))) img = await cutout(img);
          const s = sharp(img).resize(opts.size, opts.size, { fit: "cover" });
          await writeFile(out, out.endsWith(".png") ? await s.png().toBuffer() : await s.jpeg({ quality: 86 }).toBuffer());
          console.log("✓", out);
          return;
        } catch (err) {
          console.warn(`retry ${attempt} ${out}: ${err.message}`);
        }
      }
      console.error("✗", out);
  });
}

// The app only shows art that exists (lib/art.ts).
const names = async (dir) => (await readdir(dir).catch(() => [])).map((f) => f.replace(/\.\w+$/, "")).sort();
const manifest = { food: await names("public/art/food"), stickers: await names("public/art/stickers"), experts: await names("public/art/experts") };
await writeFile("public/art/manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log("manifest:", Object.entries(manifest).map(([k, v]) => `${k} ${v.length}`).join(", "));
