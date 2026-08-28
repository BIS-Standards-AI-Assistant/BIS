"use client";

import { ServiceCard } from "@/components/home/ServiceCard";
import { DocumentIcon, ShieldCheckIcon, FlaskIcon, BalanceIcon } from "@/components/ui/icons";
import { useLanguage } from "@/components/providers/LanguageProvider";

const ICONS = [
  <DocumentIcon key="doc" className="h-5 w-5" />,
  <ShieldCheckIcon key="shield" className="h-5 w-5" />,
  <FlaskIcon key="flask" className="h-5 w-5" />,
  <BalanceIcon key="balance" className="h-5 w-5" />,
];

const TONES = ["blue", "green", "orange", "purple"] as const;
const HREFS = ["/", "/", "/", "/search"];

export function ServicesSection() {
  const { t } = useLanguage();

  return (
    <section id="services">
      <h2 className="text-lg font-semibold tracking-tight text-navy">{t.services.heading}</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {t.services.cards.map((card, i) => (
          <ServiceCard
            key={card.title}
            icon={ICONS[i]}
            title={card.title}
            description={card.description}
            href={HREFS[i]}
            tone={TONES[i]}
          />
        ))}
      </div>
    </section>
  );
}
