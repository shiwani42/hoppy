/**
 * The twin's look, shared by every image (OpenAI images first, Gemini as backup).
 * Each request sends two images, the 3D one FIRST so the model edits a render, not
 * the photo (with the selfie first it tends to just retouch the photo):
 * 1) a 3D reference — the style reference (lib/avatar/style-ref.ts, cropped from the
 *    learner's mockups) for the first portrait, then the user's own portrait;
 * 2) the selfie — the only source of identity.
 */
export function twinPrompt(composition: string, opts: { ownTwin: boolean }) {
  return `Image 1 is a 3D animated-film character render (Pixar-like). Image 2 is a selfie photo of a real person.

Re-render image 1 so the 3D character becomes the person from image 2, keeping image 1's exact rendering style: soft 3D animated look, smooth matte clay-like skin with a warm blush, slightly enlarged warm expressive eyes with catchlights, hair sculpted in soft smooth clumps with gentle highlights, soft warm studio lighting. The result must look like a frame from an animated feature film — never like a photograph, never a retouched or filtered selfie.
${
    opts.ownTwin
      ? "\nImage 1 is already this person's own twin: keep that exact character — same face, hair, skin tone, proportions and rendering — and change only the pose, framing and clothes as described below.\n"
      : ""
  }
Take the person's identity from image 2 only: face shape and jawline, nose, eyes, eyebrows, lips, skin tone (never lighten or darken it), hairline, hairstyle and hair colour (including grey or balding), facial hair or clean-shaven, glasses if worn, and anything worn on the head or face (bindi, tilak, turban, hijab, earrings, nose pin). Keep their real apparent age and gender; keep wrinkles, laugh lines and grey hair, rendered gently.${
    opts.ownTwin ? "" : " Do not keep anything of the original character's face, hair, beard, age or clothes from image 1."
  }

Composition: ${composition}
One person only, centred, with a small margin around them. Background: one flat, evenly lit solid magenta (#FF00FF) — nothing else behind or around them: no floor, shadow, gradient, confetti, frame, text, logo or watermark. Keep the magenta out of the character's lighting.

Tone: dignified and flattering for adults over 40. Never childish or chibi, never exaggerated or caricatured, never mocking body size, never sexualised.`;
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
