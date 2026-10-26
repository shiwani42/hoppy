/**
 * The twin's look, shared by every image (OpenAI images first, Gemini as backup).
 * Each request sends: 1) the selfie — the only source of identity; 2) the style
 * reference (lib/avatar/style-ref.ts, cropped from the learner's mockups) — style
 * only; 3) once it exists, the user's own twin portrait, so every later pose and
 * stage stays the same character. Different faces, one consistent style.
 */
export function twinPrompt(composition: string, opts: { ownTwin: boolean }) {
  return `Create one image of this person's personal 3D "twin" for a friendly Indian health app.

INPUT IMAGES
- Image 1 is a selfie of the user. It is the ONLY source of who this person is.
- Image 2 is a style reference. Copy its rendering style exactly, but NOTHING about the person in it: not their face, age, gender, skin tone, hair, beard or clothes.${
    opts.ownTwin
      ? "\n- Image 3 is this user's existing twin. Keep the character identical to it: same face, hair, skin tone, proportions and rendering."
      : ""
  }

IDENTITY — keep from image 1, so anyone who knows them recognises them instantly:
face shape and jawline, nose, eye shape and spacing, eyebrows, lips, skin tone (never lighten or darken it), hairline, hairstyle and hair colour (including grey or balding), facial hair or clean-shaven, glasses if worn, and anything they wear on the head or face (bindi, tilak, turban, hijab, earrings, nose pin). Keep their real apparent age and gender.

STYLE — match image 2:
a high-end 3D animated feature-film character (Pixar-like), not a flat cartoon, not a sticker, not a photo. Soft subsurface-scattered skin with a matte, clay-like finish and a subtle warm blush; slightly enlarged warm, expressive eyes with catchlights; hair sculpted in smooth soft clumps with gentle highlights; rounded but true-to-life adult proportions — keep wrinkles, laugh lines and grey hair, rendered gently. Soft warm studio key light from the front-left, gentle fill, faint rim light; warm, slightly muted palette; clothes in soft matte cotton. Expression calm and kind with a small smile unless the pose says otherwise.

TONE: dignified and flattering for adults over 40. Never childish or chibi, never exaggerated or caricatured, never mocking their body size, never sexualised.

COMPOSITION: ${composition}
One person only, centred, with a small margin around them. Transparent background — no backdrop, floor, shadow, confetti, frame, text, logo or watermark.`;
}

export const STAGE_BODIES: Record<number, { name: string; body: string }> = {
  1: {
    name: "Starting Line",
    body: "Their current build exactly as it is today, drawn kindly and warmly, relaxed posture, gentle smile.",
  },
  2: {
    name: "Warming Up",
    body: "Same person a few weeks later: slightly better posture, brighter face, a little more energy in the stance.",
  },
  3: {
    name: "In Rhythm",
    body: "Same person a couple of months later: visibly a bit lighter, some muscle tone, confident smile.",
  },
  4: {
    name: "Strong",
    body: "Same person several months later: noticeably fitter, defined arms and shoulders, confident stance.",
  },
  5: {
    name: "Thriving",
    body: "Same person at a healthy goal weight: fit and energetic, glowing skin, proud happy pose.",
  },
};

const FULL_BODY =
  "Full body from head to bare feet, standing relaxed and facing the camera, hands on hips, wearing a plain saffron-orange cotton t-shirt and teal track pants.";

/** One body stage, 1–5 (the body changes slowly and kindly over the stages). */
export function avatarPrompt(stage: number, ownTwin = false) {
  return twinPrompt(`${FULL_BODY} Body: ${STAGE_BODIES[stage].body}`, { ownTwin });
}

/** Poses used around the app (images/Gemini_Generated_Image_*.png). */
export const POSES = {
  bust: "Portrait from mid-chest up, facing the camera, shoulders square, head very slightly tilted, wearing a simple teal top (a collared polo shirt, or a kurti if that suits the person better).",
  drink: "Upper body from the waist up, lifting a clear glass of water to the lips with one hand, looking relaxed, wearing a light beige cotton kurta.",
  stretch: "Full body seen from the front three-quarter view, sitting on the floor in a side-bend yoga stretch: one leg extended, one arm arched over the head; saffron-orange t-shirt, teal track pants, barefoot.",
  walk: "Full body, walking briskly towards the viewer mid-stride with arms swinging; saffron-orange t-shirt, teal track pants and white sneakers.",
  wave: "Upper body from the waist up, friendly smile, one hand raised palm-up beside the shoulder as if explaining something, wearing a saffron kurta.",
  cheer: "Upper body from the waist up, celebrating: one fist raised high above the head, big proud open smile, wearing a saffron kurta.",
} as const;
export type Pose = keyof typeof POSES;

export function posePrompt(pose: Pose, ownTwin = false) {
  return twinPrompt(POSES[pose], { ownTwin });
}

/** Portrait poses render square; full-body ones tall. */
export const isTall = (what: number | Pose) => typeof what === "number" || what === "stretch" || what === "walk";
