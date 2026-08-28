import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon } from "@/components/ui/icons";

const TONE_CLASSES = {
  blue: "bg-blue/10 text-blue",
  green: "bg-success/10 text-success",
  orange: "bg-orange/10 text-orange",
  purple: "bg-purple-600/10 text-purple-600",
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
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-border bg-surface-raised p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <span className={`flex h-11 w-11 items-center justify-center rounded-full ${TONE_CLASSES[tone]}`}>
        {icon}
      </span>
      <h3 className="mt-4 text-[15px] font-semibold text-navy">{title}</h3>
      <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-ink-soft">{description}</p>
      <span className="mt-4 flex justify-end text-ink-faint transition-colors group-hover:text-blue">
        <ArrowRightIcon className="h-4 w-4" />
      </span>
    </Link>
  );
}
