import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Mail, Phone } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { OG_IMAGE, localeNames, buildCanonical, buildAlternates } from "@/lib/seo";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "about_page" });
  const title = `${t("title")} | Optely`;
  const description = t("sub");
  return {
    title: t("title"),
    description,
    alternates: buildAlternates("/about"),
    openGraph: {
      type: "website",
      locale: localeNames[locale] ?? "sv_SE",
      url: buildCanonical(locale, "/about"),
      siteName: "Optely",
      title,
      description,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: title }],
    },
  };
}

const teamMembers = [
  {
    name: "Erik Snellman",
    roleKey: "erik_role" as const,
    email: "eriksnellman1@gmail.com",
    phone: "+358 44 971 8103",
    initials: "ES",
  },
  {
    name: "Joas Vikström",
    roleKey: "joas_role" as const,
    email: "joas.vikstrom@gmail.com",
    phone: "+358 45 616 0663",
    initials: "JV",
  },
];

function AboutContent() {
  const t = useTranslations("about_page");

  return (
    <section className="min-h-screen bg-bg pt-28 pb-24 px-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <ScrollReveal className="mb-4 text-center">
          <h1 className="font-syne text-5xl font-extrabold text-white md:text-6xl">
            {t("title")}
          </h1>
        </ScrollReveal>
        <ScrollReveal delay={0.1} className="mb-20 text-center">
          <p className="mx-auto max-w-2xl font-dm text-xl text-muted">{t("sub")}</p>
        </ScrollReveal>

        {/* Story */}
        <ScrollReveal delay={0.15}>
          <div className="mb-20 rounded-2xl border border-white/[0.06] bg-surface/60 p-10 md:p-16">
            <h2 className="mb-6 font-syne text-3xl font-bold text-white">
              {t("story_title")}
            </h2>
            <p className="font-dm text-lg text-muted leading-relaxed">
              {t("story")}
            </p>
          </div>
        </ScrollReveal>

        {/* Team */}
        <ScrollReveal>
          <h2 className="mb-10 text-center font-syne text-3xl font-bold text-white">
            {t("team_heading")}
          </h2>
        </ScrollReveal>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {teamMembers.map((member, i) => (
            <GlassCard key={member.name} delay={i * 0.1} className="p-8">
              <div className="mb-6 flex items-center gap-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 font-syne text-xl font-bold text-accent">
                  {member.initials}
                </div>
                <div>
                  <div className="font-syne text-xl font-bold text-white">
                    {member.name}
                  </div>
                  <div className="font-mono text-sm text-accent-light">
                    {t(member.roleKey)}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <a
                  href={`mailto:${member.email}`}
                  className="flex items-center gap-3 font-dm text-sm text-muted transition-colors hover:text-white"
                >
                  <Mail size={15} className="text-accent" />
                  {member.email}
                </a>
                <a
                  href={`tel:${member.phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-3 font-dm text-sm text-muted transition-colors hover:text-white"
                >
                  <Phone size={15} className="text-accent" />
                  {member.phone}
                </a>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Values */}
        <ScrollReveal delay={0.2}>
          <div className="mt-16 rounded-2xl border border-accent/20 bg-accent/5 p-10 md:p-16">
            <h2 className="mb-8 font-syne text-3xl font-bold text-white">
              {t("values_title")}
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {(["1", "2", "3"] as const).map((n) => (
                <div key={n}>
                  <h3 className="mb-2 font-syne text-lg font-bold text-white">
                    {t(`value${n}_title`)}
                  </h3>
                  <p className="font-dm text-sm text-muted leading-relaxed">
                    {t(`value${n}_desc`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

export default function AboutPage() {
  return <AboutContent />;
}
