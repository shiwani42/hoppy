/** One shared style so all five stages look like the same character. */
export const AVATAR_STYLE =
  "Turn the person in this selfie into a soft 3D stylized character: Pixar-lite clay look, " +
  "warm studio lighting, plain cream (#FBF6EE) background, full body standing, facing the camera, " +
  "wearing a teal t-shirt and dark track pants with white sneakers. Keep their face, skin tone, " +
  "hair and glasses (if any) clearly recognizable. Flattering and dignified, for adults, never " +
  "cartoonishly childish, never mocking their body. No text, no logo, no extra people.";

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

export function avatarPrompt(stage: number) {
  return `${AVATAR_STYLE}\n\nBody for this image: ${STAGE_BODIES[stage].body}`;
}
