import { getTranslations } from "next-intl/server";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { OG_IMAGE, SITE_URL, localeNames } from "@/lib/seo";
import {
  type Locale,
  servicePages,
  findServicePage,
  findServicePageAnyLocale,
  servicePagePath,
} from "@/lib/servicePages";
import {
  caseStudies,
  caseStudyLabels,
  caseStudyPath,
  findCaseStudy,
  findCaseStudyAnyLocale,
} from "@/lib/caseStudies";
import CaseStudyView from "@/components/CaseStudyView";

const locales: Locale[] = ["sv", "fi", "en"];

export function generateStaticParams() {
  return locales.flatMap((locale) => [
    ...servicePages.map((page) => ({ locale, slug: page.content[locale].slug })),
    ...caseStudies.map((study) => ({ locale, slug: study.content[locale].slug })),
  ]);
}

export async function generateMetadata({
  params: { locale, slug },
}: {
  params: { locale: Locale; slug: string };
}): Promise<Metadata> {
  const study = findCaseStudy(locale, slug);
  const page = findServicePage(locale, slug);
  if (!study && !page) return {};
  const c = study ? study.content[locale] : page!.content[locale];
  const pathFor = (l: Locale) =>
    `${SITE_URL}${study ? caseStudyPath(l, study) : servicePagePath(l, page!)}`;
  const url = pathFor(locale);
  return {
    title: { absolute: c.metaTitle },
    description: c.metaDescription,
    alternates: {
      canonical: url,
      languages: {
        sv: pathFor("sv"),
        fi: pathFor("fi"),
        en: pathFor("en"),
        "x-default": pathFor("sv"),
      },
    },
    openGraph: {
      type: "website",
      locale: localeNames[locale] ?? "sv_SE",
      url,
      siteName: "Optely",
      title: c.metaTitle,
      description: c.metaDescription,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: c.h1 }],
    },
  };
}

export default async function ServiceLandingPage({
  params: { locale, slug },
}: {
  params: { locale: Locale; slug: string };
}) {
  const study = findCaseStudy(locale, slug);
  if (study) return <CaseStudyView locale={locale} study={study} />;

  const page = findServicePage(locale, slug);
  if (!page) {
    // Language switcher keeps the slug; send it to this language's slug
    const other = findServicePageAnyLocale(slug);
    if (other) permanentRedirect(servicePagePath(locale, other));
    const otherStudy = findCaseStudyAnyLocale(slug);
    if (otherStudy) permanentRedirect(caseStudyPath(locale, otherStudy));
    notFound();
  }
  const relatedCase = caseStudies.find((cs) => cs.id === page.caseStudyId);

  const c = page.content[locale];
  const faqT = await getTranslations({ locale, namespace: "faq" });
  const processT = await getTranslations({ locale, namespace: "process" });
  const heroT = await getTranslations({ locale, namespace: "hero" });
  const navT = await getTranslations({ locale, namespace: "nav" });

  const faq = [
    ...c.faq,
    ...page.sharedFaq.map((n) => ({ q: faqT(`q${n}`), a: faqT(`a${n}`) })),
  ];
  const steps = [1, 2, 3].map((n) => ({
    title: processT(`step${n}_title`),
    desc: processT(`step${n}_desc`),
  }));
  const prefix = locale === "sv" ? "" : `/${locale}`;

  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      serviceType: page.serviceType,
      name: c.h1,
      description: c.metaDescription,
      url: `${SITE_URL}${servicePagePath(locale, page)}`,
      areaServed: { "@type": "Country", name: "Finland" },
      provider: { "@type": "ProfessionalService", name: "Optely", url: SITE_URL },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <div className="min-h-screen bg-bg px-6 pb-24 pt-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-center font-syne text-4xl font-extrabold text-white sm:text-5xl">
          {c.h1}
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-center font-dm text-lg leading-relaxed text-muted">
          {c.intro}
        </p>
        <div className="mb-20 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="https://calendly.com/optelyofficial/15min"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-accent px-8 py-3.5 font-dm text-sm font-semibold text-white shadow-glow-blue transition-all duration-300 hover:bg-accent/90"
          >
            {heroT("cta_primary")}
          </a>
          <a
            href={`${prefix}/contact`}
            className="rounded-full border border-white/10 px-8 py-3.5 font-dm text-sm font-medium text-muted transition-all duration-200 hover:border-white/20 hover:text-white"
          >
            {navT("contact")} →
          </a>
        </div>

        <div className="mb-20 grid grid-cols-1 gap-6 md:grid-cols-2">
          {c.sections.map((section, i) => (
            <GlassCard
              key={section.title}
              delay={i * 0.08}
              className={`p-8 ${c.sections.length % 2 === 1 && i === c.sections.length - 1 ? "md:col-span-2" : ""}`}
            >
              <h2 className="mb-4 font-syne text-2xl font-bold text-white">{section.title}</h2>
              {section.text && (
                <p className="font-dm leading-relaxed text-muted">{section.text}</p>
              )}
              {section.items && (
                <ul className="flex flex-col gap-3">
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

        {relatedCase && (
          <GlassCard className="mb-20 p-8">
            <div className="mb-2 font-mono text-xs uppercase tracking-widest text-accent-light">
              {caseStudyLabels[locale].label}
            </div>
            <h2 className="mb-3 font-syne text-2xl font-bold text-white">
              {relatedCase.content[locale].h1}
            </h2>
            <p className="mb-5 font-dm leading-relaxed text-muted">
              {relatedCase.content[locale].intro}
            </p>
            <a
              href={caseStudyPath(locale, relatedCase)}
              className="inline-flex items-center gap-1 font-mono text-xs text-accent-light transition-colors hover:text-accent"
            >
              {caseStudyLabels[locale].readMore} →
            </a>
          </GlassCard>
        )}

        <ScrollReveal className="mb-8 text-center">
          <h2 className="font-syne text-3xl font-bold text-white">{processT("title")}</h2>
        </ScrollReveal>
        <div className="mb-20 grid grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <GlassCard key={step.title} delay={i * 0.08} className="p-6">
              <div className="mb-3 font-mono text-sm text-accent-light">0{i + 1}</div>
              <h3 className="mb-2 font-syne text-lg font-bold text-white">{step.title}</h3>
              <p className="font-dm text-sm leading-relaxed text-muted">{step.desc}</p>
            </GlassCard>
          ))}
        </div>

        <ScrollReveal className="mb-8 text-center">
          <h2 className="font-syne text-3xl font-bold text-white">{faqT("title")}</h2>
        </ScrollReveal>
        <div className="mb-20 flex flex-col gap-4">
          {faq.map((f) => (
            <GlassCard key={f.q} hover={false} className="p-6">
              <h3 className="mb-2 font-syne text-lg font-bold text-white">{f.q}</h3>
              <p className="font-dm leading-relaxed text-muted">{f.a}</p>
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
      </div>
    </div>
  );
}
