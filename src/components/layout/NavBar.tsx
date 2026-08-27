import Link from "next/link";

export function NavBar() {
  return (
    <header className="border-b border-border bg-surface-raised">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold tracking-tight text-ink">BIS Navigator</span>
          <span className="hidden text-xs text-ink-faint sm:inline">Standards discovery</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-ink-soft">
          <Link href="/" className="hover:text-ink">
            Find a standard
          </Link>
          <Link href="/search" className="hover:text-ink">
            Search standards
          </Link>
        </nav>
      </div>
    </header>
  );
}
