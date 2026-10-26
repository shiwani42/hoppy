"use client";

import { useEffect, useRef, useState } from "react";
import { TwinArt, type Twin } from "@/components/art";
import { IconSend } from "@/components/icons";
import { Overlay } from "@/components/Overlay";
import { AnswerCard, ReplyCard, UserBubble } from "@/components/Thread";
import { BackButton } from "@/components/ui";
import type { ChatMsg } from "@/lib/chat/client";

const SUGGESTIONS = ["How much protein today?", "Can I have chai now?", "What should I eat for dinner?", "Kitna paani piya?"];

/**
 * Chat is one part of Hoppy, opened from the button on Home: ask about your day,
 * or type a log ("2 roti, dal") — logs still go to the confirm screen.
 */
export function ChatOverlay({
  name,
  twin,
  stage,
  chat,
  pending,
  onSend,
  onClose,
}: {
  name: string;
  twin: Twin | null;
  stage: number;
  chat: ChatMsg[];
  pending: { q: string; a: string } | null;
  onSend: (text: string) => Promise<void>;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const thread = useRef<HTMLDivElement>(null);

  // Keep the newest message in view.
  useEffect(() => {
    thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: "smooth" });
  }, [chat.length, pending]);

  async function send(t: string) {
    const v = t.trim();
    if (!v) return;
    setText("");
    await onSend(v);
  }

  return (
    <Overlay label="Chat with Hoppy" onClose={onClose}>
      <div className="flex h-dvh flex-col">
        <header className="flex items-center gap-3 border-b border-line px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
          <BackButton label="Close chat" />
          <span className="relative h-11 w-11 overflow-hidden rounded-full bg-peach">
            <TwinArt twin={twin} pose="bust" stage={stage} className="absolute inset-x-0 -bottom-0.5 h-12 w-11" />
          </span>
          <div>
            <h1 className="font-display text-[20px] leading-tight font-bold">Ask Hoppy</h1>
            <p className="text-[13px] text-ink-soft">About your day, food or habits</p>
          </div>
        </header>

        <div ref={thread} className="no-scrollbar flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4 [&>*]:shrink-0">
          <div className="mt-auto" />
          {chat.length === 0 && !pending && <ReplyCard>Namaste {name}! Ask me anything about today — or type what you ate, like “2 roti and dal”.</ReplyCard>}
          {chat.map((c) =>
            c.role === "user" ? <UserBubble key={c.id}>{c.content}</UserBubble> : <AnswerCard key={c.id} content={c.content} stat={c.stat} nudge={c.kind === "nudge"} />,
          )}
          {pending && (
            <>
              <UserBubble>{pending.q}</UserBubble>
              <AnswerCard content={pending.a} />
            </>
          )}
        </div>

        <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} className="h-9 shrink-0 rounded-full border border-[#e4d8c4] bg-card px-3.5 font-display text-[15px] font-semibold active:scale-95">
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
          className="flex items-center gap-2 px-4 pt-1 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
            placeholder="Ask or log…"
            aria-label="Ask or log"
            enterKeyHint="send"
            className="h-12 min-w-0 flex-1 rounded-full bg-[#ebe6dc] px-4 text-[16px] outline-none placeholder:text-[#a59d90]"
          />
          <button aria-label="Send" disabled={!text.trim()} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal text-white active:scale-95 disabled:opacity-40">
            <IconSend size={22} />
          </button>
        </form>
      </div>
    </Overlay>
  );
}
