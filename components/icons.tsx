import type { SVGProps } from "react";
import type { StatKey } from "@/lib/rules/stats";

/** Line icons (2px, rounded) and the six filled stat icons from the reference screens. */

type P = SVGProps<SVGSVGElement> & { size?: number };

function Line({ size = 22, children, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...rest}>
      {children}
    </svg>
  );
}

export const IconBack = (p: P) => <Line {...p}><path d="M15 5l-7 7 7 7" /></Line>;
export const IconChevron = (p: P) => <Line {...p}><path d="M9 5l7 7-7 7" /></Line>;
export const IconClose = (p: P) => <Line {...p}><path d="M6 6l12 12M18 6L6 18" /></Line>;
export const IconPlus = (p: P) => <Line {...p}><path d="M12 5v14M5 12h14" /></Line>;
export const IconMinus = (p: P) => <Line {...p}><path d="M5 12h14" /></Line>;
export const IconCheck = (p: P) => <Line {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Line>;
export const IconCamera = (p: P) => (
  <Line {...p}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.5-2h5.6l1.5 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
    <circle cx="12" cy="13" r="3.4" />
  </Line>
);
export const IconMic = (p: P) => (
  <Line {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
  </Line>
);
export const IconSend = (p: P) => <Line {...p}><path d="M5 12h13M13 6l6 6-6 6" /></Line>;
export const IconMenu = (p: P) => (
  <Line {...p}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="2" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="2" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="2" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2" />
  </Line>
);
export const IconSearch = (p: P) => <Line {...p}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></Line>;
export const IconShare = (p: P) => (
  <Line {...p}>
    <circle cx="17.5" cy="5.5" r="2.5" />
    <circle cx="6.5" cy="12" r="2.5" />
    <circle cx="17.5" cy="18.5" r="2.5" />
    <path d="M8.7 10.8l6.6-4M8.7 13.2l6.6 4" />
  </Line>
);
export const IconBell = (p: P) => (
  <Line {...p}>
    <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" />
    <path d="M10 20.5a2 2 0 0 0 4 0" />
  </Line>
);
export const IconClip = (p: P) => <Line {...p}><path d="M20 11.5l-7.8 7.8a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" /></Line>;
export const IconCalendar = (p: P) => (
  <Line {...p}>
    <rect x="4" y="5" width="16" height="15" rx="2.5" />
    <path d="M4 10h16M9 3v4M15 3v4M8.5 14h2M13.5 14h2M8.5 17h2" />
  </Line>
);
export const IconArrowUpRight = (p: P) => <Line {...p}><path d="M7 17L17 7M9 7h8v8" /></Line>;
export const IconEdit = (p: P) => <Line {...p}><path d="M4 20h4L19 9l-4-4L4 16z" /></Line>;
export const IconTrash = (p: P) => <Line {...p}><path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" /></Line>;
export const IconDoc = (p: P) => <Line {...p}><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h6" /></Line>;
export const IconGear = (p: P) => (
  <Line {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v2.2M12 18.8V21M4.2 7.5l1.9 1.1M17.9 15.4l1.9 1.1M4.2 16.5l1.9-1.1M17.9 8.6l1.9-1.1" />
  </Line>
);
export const IconPeople = (p: P) => (
  <Line {...p}>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
    <circle cx="17" cy="9.5" r="2.5" />
    <path d="M15.5 14.2A4.5 4.5 0 0 1 21 18.5" />
  </Line>
);
export const IconWalk = (p: P) => (
  <Line {...p}>
    <circle cx="13" cy="4.5" r="1.8" />
    <path d="M9 21l2.5-6.5L14 17v4M8 12l2-4.5 4 1.5 2 3.5M11.5 14.5L13 9" />
  </Line>
);
export const IconDrop = (p: P) => <Line {...p}><path d="M12 3c3.4 4.4 6 8 6 11.2a6 6 0 0 1-12 0C6 11 8.6 7.4 12 3z" /></Line>;

/** Filled, coloured stat icons with a soft highlight (Strength, Muscle, …). */
export function StatIcon({ k, size = 24 }: { k: StatKey; size?: number }) {
  const color = `var(--color-${k})`;
  const shine = <ellipse cx="9" cy="9" rx="2.4" ry="1.6" fill="#fff" opacity=".35" transform="rotate(-30 9 9)" />;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {k === "strength" && (
        <g fill={color}>
          <path d="M7.6 10V8.4a4.4 4.4 0 0 1 8.8 0V10" fill="none" stroke={color} strokeWidth="2.6" />
          <circle cx="12" cy="15" r="6.6" />
          <rect x="10.6" y="13.2" width="2.8" height="2.4" rx=".6" fill="#fff" opacity=".55" />
          {shine}
        </g>
      )}
      {k === "muscle" && (
        <g fill={color}>
          <path d="M3.6 18.2c0-3.2 1.4-5.6 4-6.7l1.6-5.2c.3-1.1 1.4-1.7 2.5-1.4l1.3.4c1 .3 1.5 1.4 1.1 2.3l-1.1 3c2.7-.7 5.4.5 6.6 2.7 1.1 2 .7 4.4-.9 5.9-1.4 1.3-3.3 1.8-5.1 1.8H5.4c-1 0-1.8-.8-1.8-1.8z" />
          <path d="M10.5 16.2c1.6-1.6 3.8-2 5.6-1.2" fill="none" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" opacity=".5" />
        </g>
      )}
      {k === "digestion" && (
        <g fill={color}>
          <path d="M9.4 2.5h2.6v3.2c0 1.2.9 2.2 2.1 2.4 3 .5 5.4 2.9 5.4 6 0 4.2-3.7 7.4-8.3 7.4-3 0-5.2-1.4-6.1-3.3-.5-1.1.3-2.3 1.5-2.3.9 0 1.6-.5 1.9-1.3.6-1.9 1.6-3 2.9-3.5V2.5z" />
          {shine}
        </g>
      )}
      {k === "hydration" && (
        <g fill={color}>
          <path d="M12 2.5c3.6 4.6 6.6 8.4 6.6 12a6.6 6.6 0 0 1-13.2 0c0-3.6 3-7.4 6.6-12z" />
          <ellipse cx="9.6" cy="14.6" rx="1.5" ry="2.4" fill="#fff" opacity=".4" />
        </g>
      )}
      {k === "energy" && <path d="M13.6 2L4.5 13.6h6.2L9.4 22l9.1-11.7h-6.2z" fill={color} />}
      {k === "rest" && (
        <g fill={color}>
          <path d="M19.8 15.2A8.6 8.6 0 0 1 8.8 4.2a8.6 8.6 0 1 0 11 11z" />
          <path d="M16.5 3.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6zM20 8l.4.9.9.4-.9.4-.4.9-.4-.9-.9-.4.9-.4z" />
        </g>
      )}
    </svg>
  );
}
