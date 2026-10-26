"use client";

import Link from "next/link";
import { useState } from "react";
import { Sheet } from "@/components/Sheet";

const LINKS = [
  { href: "/calendar", label: "Calendar & history", emoji: "📅" },
  { href: "/reports", label: "Reports for your doctor", emoji: "📊" },
  { href: "/meds", label: "Medicines & supplements", emoji: "💊" },
  { href: "/community", label: "Friends & leaderboard", emoji: "🤝" },
  { href: "/specialists", label: "Find a specialist", emoji: "🩺" },
  { href: "/settings", label: "Settings & reminders", emoji: "⚙️" },
];

/** Home's menu: every other screen is one tap away (prd.md > Screens and Layout). */
export function AppMenu() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Menu" className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-xl shadow-sm">
        ☰
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Hoppy">
        <nav>
          <ul className="flex flex-col gap-2">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3.5 font-display text-lg font-semibold shadow-sm">
                  <span aria-hidden>{l.emoji}</span> {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Sheet>
    </>
  );
}
