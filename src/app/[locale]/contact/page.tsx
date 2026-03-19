import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Mail, Phone, Calendar } from "lucide-react";
import BookingSection from "@/components/home/BookingSection";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { OG_IMAGE, localeNames, buildCanonical, buildAlternates } from "@/lib/seo";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "contact_page" });
  const title = `${t("title")} | Optely`;
  const description = t("sub");
  return {
    title: t("title"),
    description,
    alternates: buildAlternates("/contact"),
    openGraph: {
      type: "website",
      locale: localeNames[locale] ?? "sv_SE",
      url: buildCanonical(locale, "/contact"),
      siteName: "Optely",
      title,
      description,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: title }],
    },
  };
}

function ContactContent() {
  const t = useTranslations("contact_page");

  return (
    <div className="min-h-screen bg-bg pt-28">
      {/* Header */}
      <div className="px-6 pb-10">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal className="mb-4 text-center">
            <h1 className="font-syne text-5xl font-extrabold text-white md:text-6xl">
              {t("title")}
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.1} className="mb-12 text-center">
            <p className="font-dm text-xl text-muted">{t("sub")}</p>
          </ScrollReveal>

          {/* Contact cards */}
          <div className="mx-auto mb-10 grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { icon: Mail, label: t("email_label"), value: "eriksnellman1@gmail.com", href: "mailto:eriksnellman1@gmail.com" },
              { icon: Phone, label: t("phone_label"), value: "+358 44 971 8103", href: "tel:+358449718103" },
              { icon: Calendar, label: "Calendly", value: "Book a call", href: "https://calendly.com/optelyofficial/15min" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.06] bg-surface/60 p-6 text-center transition-all hover:border-accent/30 hover:bg-accent/5"
                >
                  <Icon className="text-accent" size={22} />
                  <div className="font-mono text-xs uppercase tracking-widest text-muted">
                    {item.label}
                  </div>
                  <div className="font-dm text-sm text-white">{item.value}</div>
                </a>
              );
            })}
          </div>
        </div>
      </div>

      <BookingSection />
    </div>
  );
}

export default function ContactPage() {
  return <ContactContent />;
}
