import type { Metadata } from "next";
import { localeNames, buildCanonical, buildAlternates } from "@/lib/seo";
import type { Locale } from "@/lib/servicePages";
import { privacyPolicy, PRIVACY_UPDATED } from "@/lib/privacyPolicy";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const p = privacyPolicy[locale] ?? privacyPolicy.sv;
  return {
    title: p.title,
    description: p.metaDescription,
    alternates: buildAlternates(locale, "/privacy"),
    openGraph: {
      type: "website",
      locale: localeNames[locale] ?? "sv_SE",
      url: buildCanonical(locale, "/privacy"),
      siteName: "Optely",
      title: `${p.title} | Optely`,
      description: p.metaDescription,
    },
  };
}

export default function PrivacyPage({ params: { locale } }: { params: { locale: Locale } }) {
  const p = privacyPolicy[locale] ?? privacyPolicy.sv;
  return (
    <div className="min-h-screen bg-bg px-6 pb-24 pt-28">
      <article className="mx-auto max-w-3xl">
        <h1 className="mb-3 font-syne text-4xl font-extrabold text-white sm:text-5xl">{p.title}</h1>
        <p className="mb-12 font-mono text-xs text-muted">
          {p.updated}: {PRIVACY_UPDATED}
        </p>
        {p.sections.map((s) => (
          <section key={s.title} className="mb-10">
            <h2 className="mb-3 font-syne text-xl font-bold text-white">{s.title}</h2>
            {s.text.map((t) => (
              <p key={t} className="mb-3 font-dm leading-relaxed text-muted">
                {t}
              </p>
            ))}
          </section>
        ))}
      </article>
    </div>
  );
}
