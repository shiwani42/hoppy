/**
 * One shared look so every image reads as the same character. The second image
 * sent with each request is the style reference (lib/avatar/style-ref.ts).
 */
export const AVATAR_STYLE =
  "Image 1 is a selfie. Image 2 is a style reference. Draw the person from image 1 as a soft 3D " +
  "animated-film character in exactly the rendering style of image 2: smooth clay-like skin, big warm eyes, " +
  "gentle smile, soft warm studio lighting. Keep their face shape, skin tone, hair (colour and style), facial " +
  "hair and glasses (if any) clearly recognizable — it must look like them, not like the person in image 2. " +
  "Dignified and flattering, for adults, never childish, never mocking their body. Plain flat cream (#FBF5E9) " +
  "background with no shadow, no floor, no confetti, no text, no logo, no extra people.";

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

const FULL_BODY = "Full body, head to bare feet visible, standing on nothing, hands on hips, wearing a plain saffron t-shirt and teal track pants.";

export function avatarPrompt(stage: number) {
  return `${AVATAR_STYLE}\n\n${FULL_BODY}\nBody for this image: ${STAGE_BODIES[stage].body}`;
}

/** Poses used around the app (images/Gemini_Generated_Image_*.png). */
export const POSES = {
  bust: "Head and shoulders, chest up, facing the camera, warm smile, wearing a teal polo shirt.",
  drink: "Upper body, drinking water from a clear glass held in one hand, eyes relaxed, wearing a light beige kurta.",
  stretch: "Full body, sitting on the floor in a side-stretch yoga pose, one leg extended, one arm arched over the head, wearing a saffron t-shirt and teal track pants, barefoot.",
  walk: "Full body, walking briskly mid-stride with arms swinging, wearing a saffron t-shirt, teal track pants and white sneakers.",
  wave: "Upper body, friendly smile, one hand raised palm-up as if explaining something, wearing a saffron kurta.",
  cheer: "Upper body, celebrating with one fist raised high, big proud smile, wearing a saffron kurta.",
} as const;
export type Pose = keyof typeof POSES;

export function posePrompt(pose: Pose) {
  return `${AVATAR_STYLE}\n\n${POSES[pose]}`;
}
