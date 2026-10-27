import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import CaseStudyCards from "@/components/CaseStudyCards";
import { OG_IMAGE, localeNames, buildCanonical, buildAlternates } from "@/lib/seo";
import type { Locale } from "@/lib/servicePages";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "cases" });
  return {
    title: t("title"),
    description: t("sub"),
    alternates: buildAlternates(locale, "/cases"),
    openGraph: {
      type: "website",
      locale: localeNames[locale] ?? "sv_SE",
      url: buildCanonical(locale, "/cases"),
      siteName: "Optely",
      title: `${t("title")} | Optely`,
      description: t("sub"),
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: t("title") }],
    },
  };
}

export default async function CasesPage({ params: { locale } }: { params: { locale: Locale } }) {
  const t = await getTranslations({ locale, namespace: "cases" });
  return (
    <div className="min-h-screen bg-bg px-6 pb-24 pt-28">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-4 text-center font-syne text-4xl font-extrabold text-white sm:text-5xl">{t("title")}</h1>
        <p className="mx-auto mb-16 max-w-2xl text-center font-dm text-lg text-muted">{t("sub")}</p>
        <CaseStudyCards locale={locale} />
      </div>
    </div>
  );
}
