import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import Link from "next/link";
import { Bot, Zap, LineChart, Cpu } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import ScrollReveal from "@/components/shared/ScrollReveal";

export default function Services() {
  const t = useTranslations("services");
  const locale = useLocale();
  const prefix = locale === "sv" ? "" : `/${locale}`;

  const services = [
    {
      icon: Zap,
      title: t("automation_title"),
      desc: t("automation_desc"),
      wide: true,
    },
    {
      icon: Bot,
      title: t("conversational_title"),
      desc: t("conversational_desc"),
      wide: false,
    },
    {
      icon: LineChart,
      title: t("consulting_title"),
      desc: t("consulting_desc"),
      wide: false,
    },
    {
      icon: Cpu,
      title: t("custom_title"),
      desc: t("custom_desc"),
      wide: true,
    },
  ];

  return (
    <section id="services" className="bg-surface/30 py-24 px-6">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal className="mb-4 text-center">
          <h2 className="font-syne text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            {t("title")}
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={0.1} className="mb-16 text-center">
          <p className="font-dm text-lg text-muted">{t("sub")}</p>
        </ScrollReveal>

        {/* Bento grid */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {services.map((service, i) => {
            const Icon = service.icon;
            return (
              <GlassCard
                key={service.title}
                delay={i * 0.08}
                className={`group p-8 ${service.wide ? "md:col-span-2" : ""}`}
              >
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 transition-colors group-hover:bg-accent/20">
                  <Icon className="text-accent-light" size={20} />
                </div>
                <h3 className="mb-3 font-syne text-xl font-bold text-white">
                  {service.title}
                </h3>
                <p className="mb-6 font-dm text-sm leading-relaxed text-muted">
                  {service.desc}
                </p>
                <Link
                  href={`${prefix}/services`}
                  className="inline-flex items-center gap-1 font-mono text-xs text-accent-light transition-colors hover:text-accent"
                >
                  {t("read_more")} →
                </Link>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
