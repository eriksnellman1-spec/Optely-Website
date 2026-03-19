import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import VvsHero from "@/components/vvs/VvsHero";
import VvsFeatures from "@/components/vvs/VvsFeatures";
import VvsProcess from "@/components/vvs/VvsProcess";
import { OG_IMAGE, localeNames, buildCanonical, buildAlternates } from "@/lib/seo";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "vvs" });
  const title = t("meta_title");
  const description = t("meta_desc");
  const canonical = buildCanonical(locale, "/vvs");
  const alternates = buildAlternates("/vvs");

  return {
    title,
    description,
    alternates,
    openGraph: {
      type: "website",
      locale: localeNames[locale] ?? "sv_SE",
      url: canonical,
      siteName: "Optely",
      title,
      description,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE],
    },
  };
}

export default function VvsPage() {
  return (
    <>
      <VvsHero />
      <VvsFeatures />
      <VvsProcess />
    </>
  );
}
