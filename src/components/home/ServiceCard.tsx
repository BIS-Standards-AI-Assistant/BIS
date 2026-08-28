import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon } from "@/components/ui/icons";

const TONE_CLASSES = {
  blue: {
    badge: "bg-blue/10 text-blue dark:bg-blue/20",
    border: "hover:border-blue/50 dark:hover:border-blue/40",
    arrow: "group-hover:text-blue",
    glow: "group-hover:shadow-blue-500/5",
  },
  green: {
    badge: "bg-success/10 text-success dark:bg-success/20",
    border: "hover:border-success/50 dark:hover:border-success/40",
    arrow: "group-hover:text-success",
    glow: "group-hover:shadow-success-500/5",
  },
  orange: {
    badge: "bg-orange/10 text-orange dark:bg-orange/20",
    border: "hover:border-orange/50 dark:hover:border-orange/40",
    arrow: "group-hover:text-orange",
    glow: "group-hover:shadow-orange-500/5",
  },
  purple: {
    badge: "bg-purple-600/10 text-purple-600 dark:bg-purple-600/20",
    border: "hover:border-purple-600/50 dark:hover:border-purple-600/40",
    arrow: "group-hover:text-purple-600",
    glow: "group-hover:shadow-purple-500/5",
  },
} as const;

export function ServiceCard({
  icon,
  title,
  description,
  href,
  tone,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  href: string;
  tone: keyof typeof TONE_CLASSES;
}) {
  const styles = TONE_CLASSES[tone];

  return (
    <Link
      href={href}
      className={`group flex flex-col rounded-xl border border-border bg-surface-raised p-6 shadow-sm transform transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${styles.border} ${styles.glow}`}
    >
      <span className={`flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110 ${styles.badge}`}>
        {icon}
      </span>
      <h3 className="mt-4 text-[15px] font-bold text-navy group-hover:text-blue transition-colors duration-200">
        {title}
      </h3>
      <p className="mt-2 flex-1 text-[13px] font-medium leading-relaxed text-ink-soft">
        {description}
      </p>
      <span className={`mt-4 flex justify-end text-ink-faint transition-all duration-300 group-hover:translate-x-1.5 ${styles.arrow}`}>
        <ArrowRightIcon className="h-4 w-4 stroke-[2]" />
      </span>
    </Link>
  );
}

