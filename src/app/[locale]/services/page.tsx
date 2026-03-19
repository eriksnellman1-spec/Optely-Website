import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Bot, Zap, LineChart, Cpu, ArrowRight } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { OG_IMAGE, localeNames, buildCanonical, buildAlternates } from "@/lib/seo";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "services_page" });
  const title = `${t("title")} | Optely`;
  const description = t("sub");
  return {
    title: t("title"),
    description,
    alternates: buildAlternates("/services"),
    openGraph: {
      type: "website",
      locale: localeNames[locale] ?? "sv_SE",
      url: buildCanonical(locale, "/services"),
      siteName: "Optely",
      title,
      description,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: title }],
    },
  };
}

function ServicesContent() {
  const t = useTranslations("services");
  const pt = useTranslations("services_page");

  const services = [
    {
      icon: Zap,
      title: t("automation_title"),
      desc: t("automation_desc"),
      points: [
        "Workflow automation",
        "Repetitive task elimination",
        "System integrations",
        "Custom triggers & actions",
      ],
    },
    {
      icon: Bot,
      title: t("conversational_title"),
      desc: t("conversational_desc"),
      points: [
        "24/7 customer support",
        "Lead qualification bots",
        "Multi-channel deployment",
        "Human handoff protocols",
      ],
    },
    {
      icon: LineChart,
      title: t("consulting_title"),
      desc: t("consulting_desc"),
      points: [
        "AI opportunity mapping",
        "ROI analysis",
        "Implementation roadmap",
        "Vendor selection",
      ],
    },
    {
      icon: Cpu,
      title: t("custom_title"),
      desc: t("custom_desc"),
      points: [
        "Custom AI agents",
        "Data pipelines",
        "API integrations",
        "Bespoke solutions",
      ],
    },
  ];

  return (
    <section className="min-h-screen bg-bg pt-28 pb-24 px-6">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal className="mb-4 text-center">
          <h1 className="font-syne text-5xl font-extrabold text-white md:text-6xl">
            {pt("title")}
          </h1>
        </ScrollReveal>
        <ScrollReveal delay={0.1} className="mb-20 text-center">
          <p className="font-dm text-xl text-muted">{pt("sub")}</p>
        </ScrollReveal>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {services.map((service, i) => {
            const Icon = service.icon;
            return (
              <GlassCard key={service.title} delay={i * 0.08} className="p-10">
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                  <Icon className="text-accent" size={22} />
                </div>
                <h2 className="mb-3 font-syne text-2xl font-bold text-white">
                  {service.title}
                </h2>
                <p className="mb-6 font-dm text-muted leading-relaxed">
                  {service.desc}
                </p>
                <ul className="flex flex-col gap-2">
                  {service.points.map((p) => (
                    <li key={p} className="flex items-center gap-2 font-dm text-sm text-muted/80">
                      <ArrowRight size={13} className="text-accent flex-shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function ServicesPage() {
  return <ServicesContent />;
}
