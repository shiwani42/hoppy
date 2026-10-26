"use client";

import type { StatCard } from "@/lib/chat/answer";

/** User and avatar chat bubbles; avatar answers can carry a Zest-style big-number card. */
export function ChatBubble({ role, content, stat, nudge }: { role: "user" | "assistant"; content: string; stat?: StatCard | null; nudge?: boolean }) {
  if (role === "user") {
    return (
      <p className="max-w-[80%] self-end rounded-[1.5rem] rounded-br-md bg-ink px-4 py-2.5 text-cream animate-fade-up" data-role="user">
        {content}
      </p>
    );
  }
  return (
    <div className={`max-w-[88%] self-start rounded-[1.5rem] rounded-tl-md bg-card p-4 shadow-sm animate-fade-up ${nudge ? "border-2 border-turmeric/40" : ""}`} data-role="assistant">
      {stat && (
        <div className="mb-2">
          <p className="text-xs text-ink-soft">{stat.label} · today</p>
          <p className="font-display text-5xl leading-none font-bold">
            {stat.value}
            <span className="ml-1 text-xl font-semibold text-ink-soft">{stat.unit}</span>
          </p>
          {stat.target ? <p className="text-xs text-ink-soft">of {stat.target} {stat.unit}</p> : null}
        </div>
      )}
      <p className="font-display text-lg leading-snug" aria-live="polite">{content}</p>
    </div>
  );
}
