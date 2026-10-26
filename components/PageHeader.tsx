import Link from "next/link";

/** Back link + title for every screen other than Home. */
export function PageHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between pb-2">
      <Link href="/" aria-label="Back to home" className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-xl text-teal shadow-sm">
        ←
      </Link>
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <div className="flex h-11 min-w-11 items-center justify-end">{right}</div>
    </header>
  );
}
