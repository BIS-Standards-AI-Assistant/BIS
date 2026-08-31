import Link from "next/link";
import { navItemHref, type NavSection } from "@/lib/navigation";

interface MegaMenuProps {
  section: NavSection;
  id: string;
}

export function MegaMenu({ section, id }: MegaMenuProps) {
  return (
    <div
      id={id}
      role="menu"
      className="absolute inset-x-0 top-full z-40 border-t border-border bg-surface-raised shadow-[0_12px_24px_-12px_rgba(4,41,79,0.18)]"
    >
      <div className="mx-auto max-w-[1380px] px-6 py-8">
        <div className="grid grid-cols-2 gap-x-8 gap-y-7 lg:grid-cols-4">
          {section.groups.map((group) => (
            <div key={group.title}>
              <h3 className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
                {group.title}
              </h3>
              <ul className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={navItemHref(section, item)}
                      role="menuitem"
                      className="block text-[13.5px] leading-snug text-ink-soft transition-colors hover:text-blue"
                    >
                      {item.label}
                      {item.real && (
                        <span className="ml-1.5 align-middle text-[9.5px] font-semibold uppercase tracking-wide text-blue">
                          Live
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {section.cta && (
          <div className="mt-7 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface-alt px-6 py-5">
            <div>
              <p className="text-[13.5px] font-semibold text-navy">{section.cta.heading}</p>
              <p className="mt-1 max-w-[52ch] text-[13px] leading-relaxed text-ink-soft">{section.cta.body}</p>
            </div>
            <Link
              href={section.cta.ctaHref}
              className="shrink-0 rounded-md bg-navy px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-navy-deep"
            >
              {section.cta.ctaLabel}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
