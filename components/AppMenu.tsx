"use client";

import Link from "next/link";
import { useState } from "react";
import { StatIcon } from "@/components/icons";
import { IconCalendar, IconDoc, IconGear, IconMenu, IconPeople, IconWalk } from "@/components/icons";
import { Sheet } from "@/components/Sheet";

const LINKS = [
  { href: "/today", label: "Daily stats", icon: <StatIcon k="energy" size={26} />, tint: "bg-energy-soft" },
  { href: "/water", label: "Paani ka tumbler", icon: <StatIcon k="hydration" size={26} />, tint: "bg-hydration-soft" },
  { href: "/move", label: "Log exercise", icon: <IconWalk size={26} className="text-strength" />, tint: "bg-strength-soft" },
  { href: "/journey", label: "Your journey", icon: <StatIcon k="muscle" size={26} />, tint: "bg-muscle-soft" },
  { href: "/meds", label: "Meds & supplements", icon: <span className="text-[22px]">💊</span>, tint: "bg-rest-soft" },
  { href: "/calendar", label: "History", icon: <IconCalendar size={26} className="text-digestion" />, tint: "bg-digestion-soft" },
  { href: "/community", label: "Hoppy friends", icon: <IconPeople size={26} className="text-teal" />, tint: "bg-teal-soft" },
  { href: "/specialists", label: "Expert support", icon: <span className="text-[22px]">🩺</span>, tint: "bg-saffron-soft" },
  { href: "/reports", label: "Doctor report", icon: <IconDoc size={26} className="text-ink" />, tint: "bg-sand" },
  { href: "/settings", label: "Settings", icon: <IconGear size={26} className="text-ink-soft" />, tint: "bg-sand" },
];

/** Home's menu: every other screen is one tap away. */
export function AppMenu() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Menu" className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card text-ink shadow-[0_1px_2px_rgb(60_40_10/0.06)] active:scale-95">
        <IconMenu size={20} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Hoppy">
        <nav>
          <ul className="grid grid-cols-2 gap-2.5">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className="flex h-[76px] items-center gap-3 rounded-[18px] bg-card px-3 font-display text-[16px] leading-tight font-semibold shadow-card active:scale-[.98]">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${l.tint}`} aria-hidden>{l.icon}</span>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Sheet>
    </>
  );
}
