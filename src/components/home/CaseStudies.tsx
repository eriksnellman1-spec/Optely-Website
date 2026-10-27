import { getTranslations } from "next-intl/server";
import CaseStudyCards from "@/components/CaseStudyCards";
import ScrollReveal from "@/components/shared/ScrollReveal";
import type { Locale } from "@/lib/servicePages";

export default async function CaseStudies({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "cases" });
  const prefix = locale === "sv" ? "" : `/${locale}`;
  return (
    <section className="bg-bg px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <ScrollReveal className="mb-4 text-center">
          <h2 className="font-syne text-3xl font-bold text-white sm:text-4xl md:text-5xl">{t("title")}</h2>
        </ScrollReveal>
        <ScrollReveal delay={0.1} className="mb-12 text-center">
          <p className="font-dm text-lg text-muted">{t("sub")}</p>
        </ScrollReveal>
        <CaseStudyCards locale={locale} />
        <div className="mt-10 text-center">
          <a href={`${prefix}/cases`} className="font-mono text-xs text-accent-light transition-colors hover:text-accent">
            {t("all")} →
          </a>
        </div>
      </div>
    </section>
  );
}
