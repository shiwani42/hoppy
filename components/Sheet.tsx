"use client";

import { useEffect } from "react";

/** Bottom sheet used for confirm, search and stats. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close" className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div className="relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-[2rem] bg-cream px-5 pt-3 pb-8 shadow-2xl animate-fade-up">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line" />
        <h2 className="mb-4 font-display text-2xl font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
