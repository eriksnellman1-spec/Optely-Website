import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import { SITE_URL } from "@/lib/seo";
import type { Locale } from "@/lib/servicePages";
import { type CaseStudy, caseStudyLabels, caseStudyPath } from "@/lib/caseStudies";

export default async function CaseStudyView({
  locale,
  study,
}: {
  locale: Locale;
  study: CaseStudy;
}) {
  const c = study.content[locale];
  const heroT = await getTranslations({ locale, namespace: "hero" });

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: c.h1,
    description: c.metaDescription,
    inLanguage: locale,
    url: `${SITE_URL}${caseStudyPath(locale, study)}`,
    author: { "@type": "Organization", name: "Optely", url: SITE_URL },
    publisher: { "@type": "Organization", name: "Optely", url: SITE_URL },
  };

  return (
    <div className="min-h-screen bg-bg px-6 pb-24 pt-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <article className="mx-auto max-w-3xl">
        <div className="mb-4 text-center font-mono text-xs uppercase tracking-widest text-accent-light">
          {caseStudyLabels[locale].label}
        </div>
        <h1 className="mb-6 text-center font-syne text-4xl font-extrabold text-white sm:text-5xl">
          {c.h1}
        </h1>
        <p className="mb-16 text-center font-dm text-lg leading-relaxed text-muted">{c.intro}</p>

        <div className="mb-16 flex flex-col gap-6">
          {c.sections.map((section, i) => (
            <GlassCard key={section.title} delay={i * 0.08} hover={false} className="p-8">
              <h2 className="mb-4 font-syne text-2xl font-bold text-white">{section.title}</h2>
              {section.text && (
                <p className="font-dm leading-relaxed text-muted">{section.text}</p>
              )}
              {section.items && (
                <ul className="mt-4 flex flex-col gap-3">
                  {section.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 font-dm text-muted">
                      <ArrowRight size={14} className="mt-1.5 flex-shrink-0 text-accent" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </GlassCard>
          ))}
        </div>

        <div className="text-center">
          <a
            href="https://calendly.com/optelyofficial/15min"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-full bg-accent px-8 py-3.5 font-dm text-sm font-semibold text-white shadow-glow-blue transition-all duration-300 hover:bg-accent/90"
          >
            {heroT("cta_primary")}
          </a>
        </div>
      </article>
    </div>
  );
}
