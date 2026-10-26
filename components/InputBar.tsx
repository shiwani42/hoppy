"use client";

import { useRef } from "react";

/** Pinned bottom bar: snap a meal or search for one (later: mic and chat). */
export function InputBar({
  onPhoto,
  onSearch,
  children,
}: {
  onPhoto: (file: File) => void;
  onSearch: () => void;
  children?: React.ReactNode;
}) {
  const camera = useRef<HTMLInputElement>(null);
  return (
    <div className="sticky bottom-0 z-30 -mx-5 mt-auto bg-gradient-to-t from-cream via-cream to-cream/0 px-5 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        data-testid="meal-photo-input"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onPhoto(f);
        }}
      />
      <div className="flex items-center gap-2 rounded-full bg-card p-2 shadow-lg">
        <button
          onClick={() => camera.current?.click()}
          aria-label="Snap a meal"
          className="flex h-12 items-center gap-2 rounded-full bg-teal px-5 font-display font-semibold text-white active:scale-[.97]"
        >
          <span aria-hidden>📷</span> Snap a meal
        </button>
        {children}
        <button onClick={onSearch} aria-label="Search food" className="ml-auto h-12 w-12 rounded-full bg-cream text-xl active:scale-[.97]">
          🔍
        </button>
      </div>
    </div>
  );
}
