"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

/** Bottom sheet (menu, small forms, request consult). */
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
  // Portalled to <body> so a sheet opened from a header or card sits above everything.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close" className="absolute inset-0 bg-[#2b2218]/35 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-cream px-6 pt-3 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-lift animate-fade-up">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#e2d7c3]" />
        <h2 className="mb-4 font-display text-[26px] leading-tight font-extrabold">{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
