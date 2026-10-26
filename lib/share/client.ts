"use client";

import { toBlob } from "html-to-image";
import { supabase } from "@/lib/supabase/client";

/** Renders the card node to a 1080×1920 PNG (3× its 360×640 CSS size). */
export async function renderCard(node: HTMLElement): Promise<Blob> {
  const blob = await toBlob(node, { pixelRatio: 3, cacheBust: true, backgroundColor: "#fbf6ee" });
  if (!blob) throw new Error("Couldn't draw the card");
  return blob;
}

/** Saves the card to the user's history (feeds the Community feed later). */
export async function recordCard(blob: Blob, kind: "today" | "milestone", title: string) {
  const sb = supabase();
  const { data: auth } = await sb.auth.getUser();
  const image_path = `${auth.user!.id}/${kind}-${Date.now()}.png`;
  const up = await sb.storage.from("cards").upload(image_path, blob, { contentType: "image/png" });
  if (up.error) throw up.error;
  const { error } = await sb.from("shared_cards").insert({ kind, title, image_path });
  if (error) throw error;
}

/** Native share sheet with the image, or a download when files can't be shared. */
export async function shareOrDownload(blob: Blob, filename: string, text: string): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([blob], filename, { type: "image/png" });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return "shared";
    } catch (err) {
      if ((err as Error).name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "downloaded";
}
