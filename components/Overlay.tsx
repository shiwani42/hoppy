"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

/** A full-screen step over the current screen (Confirm Lunch, Voice Logging, questions). */
export function Overlay({ label, onClose, children, tone = "cream" }: { label: string; onClose: () => void; children: React.ReactNode; tone?: "cream" | "night" }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className={`fixed inset-0 z-50 mx-auto flex max-w-md flex-col overflow-y-auto animate-fade-up ${tone === "night" ? "bg-night" : "bg-cream"}`}
    >
      {children}
    </div>,
    document.body,
  );
}
