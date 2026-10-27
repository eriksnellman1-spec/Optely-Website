import Hero from "@/components/home/Hero";
import TrustBar from "@/components/home/TrustBar";
import Strengths from "@/components/home/Strengths";
import Services from "@/components/home/Services";
import HowWeWork from "@/components/home/HowWeWork";
import ProcessSteps from "@/components/home/ProcessSteps";
import WhyOptely from "@/components/home/WhyOptely";
import BookingSection from "@/components/home/BookingSection";
import FAQ from "@/components/home/FAQ";
import CaseStudies from "@/components/home/CaseStudies";
import type { Locale } from "@/lib/servicePages";
import { getTranslations } from "next-intl/server";

export default async function HomePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations({ locale, namespace: "faq" });
  // Same questions as the visible FAQ section, so search engines can show them as rich results
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [1, 2, 3, 4, 5].map((n) => ({
      "@type": "Question",
      name: t(`q${n}`),
      acceptedAnswer: { "@type": "Answer", text: t(`a${n}`) },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Hero />
      <TrustBar />
      <Strengths />
      <Services />
      <HowWeWork />
      <ProcessSteps />
      <CaseStudies locale={locale as Locale} />
      <WhyOptely />
      <BookingSection />
      <FAQ />
    </>
  );
}
