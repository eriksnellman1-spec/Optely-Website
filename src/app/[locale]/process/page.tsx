import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import HowWeWork from "@/components/home/HowWeWork";
import ProcessSteps from "@/components/home/ProcessSteps";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { OG_IMAGE, localeNames, buildCanonical, buildAlternates } from "@/lib/seo";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "process_page" });
  const hw = await getTranslations({ locale, namespace: "how_we_work" });
  const title = `${t("heading")} | Optely`;
  const description = hw("phase1_desc");
  return {
    title: t("heading"),
    description,
    alternates: buildAlternates(locale, "/process"),
    openGraph: {
      type: "website",
      locale: localeNames[locale] ?? "sv_SE",
      url: buildCanonical(locale, "/process"),
      siteName: "Optely",
      title,
      description,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: title }],
    },
  };
}

function ProcessContent() {
  const t = useTranslations("process_page");
  return (
    <div className="min-h-screen bg-bg pt-28">
      <ScrollReveal className="px-6 pb-2 text-center">
        <h1 className="font-syne text-5xl font-extrabold text-white md:text-6xl">
          {t("heading")}
        </h1>
      </ScrollReveal>
      <HowWeWork />
      <ProcessSteps />
    </div>
  );
}

export default function ProcessPage() {
  return <ProcessContent />;
}
