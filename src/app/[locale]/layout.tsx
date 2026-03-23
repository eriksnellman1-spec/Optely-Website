import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { syne, dmSans, jetbrainsMono } from "@/lib/fonts";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/shared/Footer";
import CursorGlow from "@/components/shared/CursorGlow";
import { SITE_URL, OG_IMAGE, localeNames, buildCanonical, buildAlternates } from "@/lib/seo";
import "../globals.css";

const locales = ["sv", "fi", "en"];

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "meta" });
  const title = t("title");
  const description = t("description");
  const canonical = buildCanonical(locale);
  const alternates = buildAlternates();

  return {
    title: {
      default: title,
      template: `%s | Optely`,
    },
    description,
    metadataBase: new URL(SITE_URL),
    icons: {
      icon: "/favicon.png",
      apple: "/favicon.png",
    },
    alternates,
    openGraph: {
      type: "website",
      locale: localeNames[locale] ?? "sv_SE",
      alternateLocale: Object.values(localeNames).filter(
        (l) => l !== localeNames[locale]
      ),
      url: canonical,
      siteName: "Optely",
      title,
      description,
      images: [
        {
          url: OG_IMAGE,
          width: 1200,
          height: 630,
          alt: "Optely — AI-konsult & Automation, Österbotten Finland",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
  };
}

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Optely",
  description:
    "AI consulting and automation agency based in Ostrobothnia, Finland. We help Finnish SMEs work smarter through AI solutions, process automation, and conversational AI.",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.webp`,
  image: OG_IMAGE,
  telephone: "+358449718103",
  email: "eriksnellman1@gmail.com",
  address: {
    "@type": "PostalAddress",
    addressRegion: "Pohjanmaa",
    addressCountry: "FI",
    addressLocality: "Österbotten",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 63.0,
    longitude: 21.5,
  },
  areaServed: {
    "@type": "Country",
    name: "Finland",
  },
  founder: [
    { "@type": "Person", name: "Erik Snellman" },
    { "@type": "Person", name: "Joas Vikström" },
  ],
  sameAs: [
    "https://www.instagram.com/optely",
    "https://www.facebook.com/optely",
  ],
};

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale)) notFound();

  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${syne.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
      </head>
      <body className="bg-bg text-white antialiased">
        <NextIntlClientProvider messages={messages}>
          <CursorGlow />
          <Navbar />
          <main>{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
